import NextAuth, { type NextAuthOptions, type Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import { recordAudit } from "./audit";
import {
  MAX_2FA_FAILURES,
  clearFailures,
  decryptSecret,
  isLockedOut,
  isTotpToken,
  registerFailure,
  verifyRecoveryCode,
  verifyTotp,
} from "./totp";

/** NextAuth v4 passes a plain-object-headers req to authorize. */
function ipFrom(req?: { headers?: Record<string, string> }): string | undefined {
  const h = req?.headers ?? {};
  const xff = h["x-forwarded-for"] || h["x-real-ip"];
  return xff ? xff.split(",")[0]?.trim() : undefined;
}

/**
 * Second factor for a password-verified user. Returns the NextAuth user on
 * success; THROWS a stable code the login UI maps to a Bulgarian message:
 *   2FA_REQUIRED (show the code UI) · INVALID_2FA · 2FA_LOCKED.
 * TOTP (6 digits) or a single-use recovery code. Lockout after MAX_2FA_FAILURES.
 */
async function verifySecondFactor(
  user: { id: string; twoFactorSecret: string | null },
  token: string | undefined,
  req?: { headers?: Record<string, string> },
): Promise<void> {
  const code = token?.trim();
  if (!code) throw new Error("2FA_REQUIRED");

  const ip = ipFrom(req);
  const userAgent = req?.headers?.["user-agent"];

  if (await isLockedOut(user.id)) {
    await recordAudit({ ip, userAgent, userId: user.id, action: "user.2fa.locked", entity: "User", entityId: user.id });
    throw new Error("2FA_LOCKED");
  }

  let ok = false;
  let viaRecovery = false;
  if (isTotpToken(code) && user.twoFactorSecret) {
    ok = verifyTotp(code, decryptSecret(user.twoFactorSecret));
  } else {
    const candidates = await (prisma as any).twoFactorRecoveryCode.findMany({
      where: { userId: user.id, usedAt: null },
    });
    for (const c of candidates) {
      if (await verifyRecoveryCode(code, c.codeHash)) {
        await (prisma as any).twoFactorRecoveryCode.update({ where: { id: c.id }, data: { usedAt: new Date() } });
        ok = true;
        viaRecovery = true;
        break;
      }
    }
  }

  if (!ok) {
    const attempts = await registerFailure(user.id);
    await recordAudit({ ip, userAgent, userId: user.id, action: "user.2fa.verify.failed", entity: "User", entityId: user.id, details: { attempts } });
    if (attempts >= MAX_2FA_FAILURES) {
      await recordAudit({ ip, userAgent, userId: user.id, action: "user.2fa.locked", entity: "User", entityId: user.id });
      throw new Error("2FA_LOCKED");
    }
    throw new Error("INVALID_2FA");
  }

  await clearFailures(user.id);
  if (viaRecovery) {
    const remaining = await (prisma as any).twoFactorRecoveryCode.count({ where: { userId: user.id, usedAt: null } });
    await recordAudit({ ip, userAgent, userId: user.id, action: "user.2fa.recovery_used", entity: "User", entityId: user.id, details: { remaining } });
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Парола", type: "password" },
        // Second factor: 6-digit TOTP or a recovery code (only required when 2FA is enabled).
        token: { label: "2FA", type: "text" },
      },
      async authorize(credentials: Record<string, string> | undefined, req?: { headers?: Record<string, string> }) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        // Try existing user first
        const user = await prisma.user.findUnique({ where: { email } });
        if (user?.password) {
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) return null;
          // Second factor gate (throws a stable code on require/invalid/locked).
          // An existing user is ALWAYS matched here, so env creds can never
          // bypass an enrolled account's 2FA — the bootstrap path below only
          // runs when no DB user exists yet.
          if ((user as any).twoFactorEnabled && (user as any).twoFactorSecret) {
            await verifySecondFactor(user as any, credentials.token, req);
          }
          return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined, image: user.image ?? undefined };
        }

        // Env bootstrap admin fallback: ensure admin exists if credentials match .env.
        // Initial-setup only — fires solely when no DB user exists for this email.
        // The created admin has twoFactorEnabled=false, so the mandatory ADMIN gate
        // (admin layout) immediately forces enrollment before any admin route loads.
        // Disable post-setup with DISABLE_ADMIN_BOOTSTRAP=true.
        if (process.env.DISABLE_ADMIN_BOOTSTRAP === "true") return null;
        const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const envAdminPass = process.env.ADMIN_PASSWORD;
        if (envAdminEmail && envAdminPass && email === envAdminEmail && password === envAdminPass) {
          const hash = await bcrypt.hash(envAdminPass, 10);
          const admin = await prisma.user.upsert({
            where: { email: envAdminEmail },
            update: { password: hash, role: "ADMIN" } as any,
            create: { email: envAdminEmail, password: hash, name: "Admin", role: "ADMIN" } as any,
          });
          return { id: admin.id, name: admin.name ?? undefined, email: admin.email ?? undefined, image: admin.image ?? undefined };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }): Promise<JWT> {
      if (user) token.userId = (user as any).id;
      // enrich token with role for quick checks
      if (token.userId) {
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: token.userId as string } as any });
          if (dbUser) {
            (token as any).role = (dbUser as any).role;
            // Drives the mandatory 2FA gate in middleware; re-read each request so
            // the gate releases immediately after enrollment.
            (token as any).twoFactorEnabled = (dbUser as any).twoFactorEnabled ?? false;
          }
        } catch {
          // ignore
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (token?.userId && session.user) (session.user as any).id = token.userId;
      if (session.user) (session.user as any).role = (token as any).role ?? undefined;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { auth } = NextAuth(authOptions);
