import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function sanitize(s?: string | null) {
  return (s || "").trim();
}

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  try {
    const token = sanitize(params?.token);
    if (!token) return NextResponse.json({ ok: false, reason: "missing" }, { status: 400 });
    const now = new Date();

    // Read the record first to get the secret value (not returned by updateMany)
    const record = await (prisma as any).oneTimeSecret.findUnique({ where: { token } });
    if (!record) return NextResponse.json({ ok: false, reason: "missing" }, { status: 404 });
    if (record.usedAt) return NextResponse.json({ ok: false, reason: "used" }, { status: 409 });
    if (record.expiresAt <= now) return NextResponse.json({ ok: false, reason: "expired" }, { status: 410 });

    // Atomically mark as used only if not used and not expired
    const result = await (prisma as any).oneTimeSecret.updateMany({
      where: { token, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now, secret: null },
    });
    if (result.count !== 1) {
      // Another process likely claimed it in between
      return NextResponse.json({ ok: false, reason: "used" }, { status: 409 });
    }

    const secret = record.secret || "";
    return NextResponse.json({ ok: true, secret });
  } catch (err) {
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
