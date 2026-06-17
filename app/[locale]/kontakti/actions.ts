"use server";

import { headers } from "next/headers";

import { contactSchema } from "@/lib/content/validation";
import { formatZodErrors } from "@/lib/content/validation";
import { getRedisClient } from "@/lib/redis";

export interface ContactState {
  ok: boolean;
  /** field path → friendly Bulgarian message */
  errors?: Record<string, string>;
  /** form-level error key (resolved to a message client-side) */
  errorKey?: "turnstile" | "rateLimited" | "send";
  sent?: boolean; // true only when actually emailed (prod); false in keyless dev
}

const RATE_LIMIT = 5; // submissions per window
const RATE_WINDOW_S = 3600; // 1 hour

async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true; // dev / not configured → skip
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

async function underRateLimit(ip: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return true; // no Redis → skip limiting in dev
  try {
    const key = `contact:rl:${ip}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, RATE_WINDOW_S);
    return n <= RATE_LIMIT;
  } catch {
    return true; // Redis hiccup must not block legitimate users
  }
}

async function sendEmail(values: { name: string; email: string; topic: string; message: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO ?? "tues@elsys-bg.org";
  const from = process.env.CONTACT_FROM ?? "ТУЕС <noreply@elsys-bg.org>";
  if (!apiKey) {
    console.info("[contact] no RESEND_API_KEY — skipping send (dev). Payload:", { ...values, message: values.message.slice(0, 60) });
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      reply_to: values.email,
      subject: `[Контакт] ${values.topic} — ${values.name}`,
      text: `Име: ${values.name}\nИмейл: ${values.email}\nТема: ${values.topic}\n\n${values.message}`,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
  return true;
}

/**
 * Contact submission. (a) re-validate with Zod, (b) verify Turnstile, (c)
 * rate-limit via Upstash/Redis, (d) send via Resend — (b)/(c)/(d) gated behind
 * env keys; absent in dev → validate + report success WITHOUT sending. No DB.
 */
export async function submitContact(
  raw: { name: string; email: string; topic: string; message: string; turnstileToken?: string },
): Promise<ContactState> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: formatZodErrors(parsed.error) };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";

  if (!(await verifyTurnstile(raw.turnstileToken ?? "", ip))) return { ok: false, errorKey: "turnstile" };
  if (!(await underRateLimit(ip))) return { ok: false, errorKey: "rateLimited" };

  try {
    const sent = await sendEmail(parsed.data);
    return { ok: true, sent };
  } catch {
    return { ok: false, errorKey: "send" };
  }
}
