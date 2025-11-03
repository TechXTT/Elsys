import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return { ok: false as const, status: 401 as const };
  }
  const me = await prisma.user.findUnique({ where: { id: (session.user as any).id as string } });
  if (!me || (me as any).role !== "ADMIN") return { ok: false as const, status: 403 as const };
  return { ok: true as const, me };
}

function generatePassword(len = 12) {
  return crypto.randomBytes(16).toString("base64url").slice(0, len);
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true, role: true } as any,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    firstName?: string;
    lastName?: string;
    gradeLevel?: number;
    gradeClass?: "A" | "B" | "V" | "G";
    role?: "ADMIN" | "USER";
  } | null;

  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "User already exists" }, { status: 409 });

  const passwordPlain = generatePassword(14);
  const password = await bcrypt.hash(passwordPlain, 10);
  const role = body?.role === "ADMIN" ? "ADMIN" : "USER";

  const user = await prisma.user.create({
    data: {
      email,
      firstName: body?.firstName?.trim() || null,
      lastName: body?.lastName?.trim() || null,
      name: body?.firstName || body?.lastName ? `${body?.firstName ?? ""} ${body?.lastName ?? ""}`.trim() : null,
      gradeLevel: typeof body?.gradeLevel === "number" ? body?.gradeLevel : null,
      gradeClass: body?.gradeClass ?? null,
      role: role as any,
      password,
    } as any,
    select: { id: true, email: true, name: true } as any,
  });

  return NextResponse.json({ user, password: passwordPlain }, { status: 201 });
}
