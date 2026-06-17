import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { isLockedOut } from "@/lib/totp";

/**
 * No-session precheck that drives the login UI: given a valid password, reports
 * whether 2FA is required + whether the account is locked. It does NOT verify or
 * consume any 2FA token and grants no session — authorize() remains the sole
 * verifier/gate (NextAuth v4 collapses authorize's thrown errors, so the client
 * needs this to know when to reveal the code step). Mirrors authorize's password
 * + bootstrap logic.
 */
export async function POST(req: Request) {
  // Intentionally NO auth guard: this is a pre-login precheck (no session yet).
  let email = "";
  let password = "";
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    email = (body.email ?? "").trim().toLowerCase();
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!email || !password) return NextResponse.json({ ok: false });

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.password) {
    if (!(await bcrypt.compare(password, user.password))) return NextResponse.json({ ok: false });
    const required = !!(user as any).twoFactorEnabled && !!(user as any).twoFactorSecret;
    const locked = required ? await isLockedOut(user.id) : false;
    return NextResponse.json({ ok: true, required, locked });
  }

  // Bootstrap admin (initial setup only) — no 2FA yet; the mandatory gate handles enrollment.
  if (process.env.DISABLE_ADMIN_BOOTSTRAP !== "true") {
    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const envPass = process.env.ADMIN_PASSWORD;
    if (envEmail && envPass && email === envEmail && password === envPass) {
      return NextResponse.json({ ok: true, required: false, locked: false });
    }
  }
  return NextResponse.json({ ok: false });
}
