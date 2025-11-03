import NextAuth, { type NextAuthOptions, type Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

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
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        // Try existing user first
        const user = await prisma.user.findUnique({ where: { email } });
        if (user?.password) {
          const valid = await bcrypt.compare(password, user.password);
          if (!valid) return null;
          return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined, image: user.image ?? undefined };
        }

        // Env bootstrap admin fallback: ensure admin exists if credentials match .env
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
          if (dbUser) (token as any).role = (dbUser as any).role;
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
