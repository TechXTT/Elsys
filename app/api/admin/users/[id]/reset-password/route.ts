import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/auth/api-guard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { recordAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return { ok: false as const, status: 401 as const };
  }
  const me = await prisma.user.findUnique({ where: { id: (session.user as any).id as string } });
  if (!me || (me as any).role !== "ADMIN") return { ok: false as const, status: 403 as const };
  return { ok: true as const, me };
}

function generatePassword(len = 14) {
  return crypto.randomBytes(16).toString("base64url").slice(0, len);
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const __g = await apiGuard("users:manage"); if (__g instanceof NextResponse) return __g;
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const passwordPlain = generatePassword(14);
  const hash = await bcrypt.hash(passwordPlain, 10);

  // Update user's password
  await prisma.user.update({ where: { id: params.id }, data: { password: hash } });

  // Invalidate previous reset/initial tokens of this user
  await (prisma as any).oneTimeSecret.deleteMany({ where: { userId: params.id, usedAt: null } });

  // Create new reset token with 24h expiry
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await (prisma as any).oneTimeSecret.create({
    data: {
      token,
      userId: params.id,
      type: "RESET_PASSWORD",
      secret: passwordPlain,
      expiresAt,
    },
  });

  try {
    await recordAudit({
      req: _req,
      userId: auth.me.id,
      action: "USER_RESET_PASSWORD",
      entity: "User",
      entityId: params.id,
    });
  } catch {}

  return NextResponse.json({ oneTimeLink: `/one-time/${token}` });
}
