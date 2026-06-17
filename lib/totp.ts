import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";

import { getRedisClient } from "@/lib/redis";

// ---------------------------------------------------------------------------
// TOTP 2FA core (G). Secret encrypted at rest (AES-256-GCM, node:crypto);
// recovery codes hashed (bcrypt); failed-verify lockout (memory → Redis).
// ---------------------------------------------------------------------------

authenticator.options = { window: 1 }; // accept ±1 step (clock skew)

const ISSUER = "ТУЕС Admin";

/** 32-byte key from TOTP_ENCRYPTION_KEY (base64), or null when not configured. */
function getKey(): Buffer | null {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : null;
}

/** True when the server can encrypt/decrypt secrets (enrollment is refused otherwise). */
export function isTotpConfigured(): boolean {
  return getKey() !== null;
}

/** AES-256-GCM → "iv.tag.ciphertext" (all base64). Format is rotation-friendly. */
export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) throw new Error("TOTP_ENCRYPTION_KEY not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string {
  const key = getKey();
  if (!key) throw new Error("TOTP_ENCRYPTION_KEY not configured");
  const [ivB, tagB, ctB] = stored.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString("utf8");
}

// --- TOTP (otplib) ---------------------------------------------------------
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}
export function totpKeyUri(accountName: string, secret: string): string {
  return authenticator.keyuri(accountName, ISSUER, secret);
}
export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.trim(), secret });
  } catch {
    return false;
  }
}
/** A 6-digit numeric code is a TOTP; anything else is treated as a recovery code. */
export function isTotpToken(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

// --- Recovery codes --------------------------------------------------------
const norm = (code: string) => code.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/** N grouped, human-readable single-use codes, e.g. "k7m2p-q9wzx". */
export function generateRecoveryCodes(n = 10): string[] {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  const pick = () => alphabet[randomBytes(1)[0] % alphabet.length];
  return Array.from({ length: n }, () => {
    const s = Array.from({ length: 10 }, pick).join("");
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}
export function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(norm(code), 10);
}
export function verifyRecoveryCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(norm(code), hash);
}

// --- Failed-verify lockout (memory → Redis) --------------------------------
export const MAX_2FA_FAILURES = 5;
const WINDOW_S = 900; // 15 minutes
// On globalThis so the counter is a single instance across route bundles in the
// same process (authorize + the precheck route must agree even without Redis).
declare global {
  // eslint-disable-next-line no-var
  var __elsys2faFail__: Map<string, { count: number; expires: number }> | undefined;
}
const mem: Map<string, { count: number; expires: number }> =
  globalThis.__elsys2faFail__ ?? (globalThis.__elsys2faFail__ = new Map());
const keyFor = (userId: string) => `2fa:fail:${userId}`;

/** Current failure count in the window (Redis authoritative, memory fallback). */
export async function getFailures(userId: string): Promise<number> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const v = await redis.get(keyFor(userId));
      if (v != null) return Number(v) || 0;
    } catch {
      /* fall through to memory */
    }
  }
  const m = mem.get(userId);
  return m && m.expires > Date.now() ? m.count : 0;
}

export async function isLockedOut(userId: string): Promise<boolean> {
  return (await getFailures(userId)) >= MAX_2FA_FAILURES;
}

/** Record one failure; returns the new count. */
export async function registerFailure(userId: string): Promise<number> {
  const now = Date.now();
  const m = mem.get(userId);
  if (m && m.expires > now) m.count += 1;
  else mem.set(userId, { count: 1, expires: now + WINDOW_S * 1000 });
  const memCount = mem.get(userId)!.count;

  const redis = getRedisClient();
  if (redis) {
    try {
      const n = await redis.incr(keyFor(userId));
      if (n === 1) await redis.expire(keyFor(userId), WINDOW_S);
      return n;
    } catch {
      /* fall through */
    }
  }
  return memCount;
}

export async function clearFailures(userId: string): Promise<void> {
  mem.delete(userId);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(keyFor(userId));
    } catch {
      /* ignore */
    }
  }
}
