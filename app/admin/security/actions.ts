"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import {
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  isTotpConfigured,
  totpKeyUri,
  verifyTotp,
} from "@/lib/totp";

async function currentAdmin() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;
  if (!id || role !== "ADMIN") return null;
  return prisma.user.findUnique({ where: { id } });
}

async function auditMeta() {
  const h = await headers();
  return { ip: h.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: h.get("user-agent") ?? undefined };
}

export interface StartResult { ok: boolean; error?: "unauthorized" | "not_configured"; qr?: string; secret?: string; otpauth?: string }

/** Generate a pending secret (stored encrypted, not yet enabled) + QR for scanning. */
export async function startEnrollment(): Promise<StartResult> {
  const user = await currentAdmin();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!isTotpConfigured()) return { ok: false, error: "not_configured" };

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false } as any });
  const otpauth = totpKeyUri(user.email ?? user.id, secret);
  const qr = await QRCode.toDataURL(otpauth);
  return { ok: true, qr, secret, otpauth };
}

export interface ConfirmResult { ok: boolean; error?: "unauthorized" | "no_pending" | "invalid_code"; recoveryCodes?: string[] }

/** Confirm-by-code, then enable 2FA and issue (return-once) recovery codes. */
export async function confirmEnrollment(code: string): Promise<ConfirmResult> {
  const user = await currentAdmin();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!(user as any).twoFactorSecret) return { ok: false, error: "no_pending" };
  if (!verifyTotp(code, decryptSecret((user as any).twoFactorSecret))) return { ok: false, error: "invalid_code" };

  const codes = generateRecoveryCodes(10);
  const hashes = await Promise.all(codes.map(hashRecoveryCode));
  await prisma.$transaction([
    (prisma as any).twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true, twoFactorEnrolledAt: new Date() } as any }),
    (prisma as any).twoFactorRecoveryCode.createMany({ data: hashes.map((codeHash) => ({ userId: user.id, codeHash })) }),
  ]);

  const meta = await auditMeta();
  await recordAudit({ ...meta, userId: user.id, action: "user.2fa.enroll", entity: "User", entityId: user.id, details: { codes: codes.length } });
  return { ok: true, recoveryCodes: codes };
}

export interface ReauthResult { ok: boolean; error?: "unauthorized" | "bad_password" | "not_enabled"; recoveryCodes?: string[] }

/** Disable 2FA after re-entering the current password. */
export async function disableTwoFactor(password: string): Promise<ReauthResult> {
  const user = await currentAdmin();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!user.password || !(await bcrypt.compare(password, user.password))) return { ok: false, error: "bad_password" };

  await prisma.$transaction([
    (prisma as any).twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnrolledAt: null } as any }),
  ]);

  const meta = await auditMeta();
  await recordAudit({ ...meta, userId: user.id, action: "user.2fa.disable", entity: "User", entityId: user.id });
  return { ok: true };
}

/** Re-issue recovery codes after re-entering the current password. */
export async function regenerateRecoveryCodes(password: string): Promise<ReauthResult> {
  const user = await currentAdmin();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!(user as any).twoFactorEnabled) return { ok: false, error: "not_enabled" };
  if (!user.password || !(await bcrypt.compare(password, user.password))) return { ok: false, error: "bad_password" };

  const codes = generateRecoveryCodes(10);
  const hashes = await Promise.all(codes.map(hashRecoveryCode));
  await prisma.$transaction([
    (prisma as any).twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    (prisma as any).twoFactorRecoveryCode.createMany({ data: hashes.map((codeHash) => ({ userId: user.id, codeHash })) }),
  ]);

  const meta = await auditMeta();
  await recordAudit({ ...meta, userId: user.id, action: "user.2fa.recovery_regenerated", entity: "User", entityId: user.id, details: { codes: codes.length } });
  return { ok: true, recoveryCodes: codes };
}
