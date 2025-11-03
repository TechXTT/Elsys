import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return { ok: false as const, status: 401 as const };
  }
  const me = await prisma.user.findUnique({ where: { id: (session.user as any).id as string } });
  if (!me || (me as any).role !== "ADMIN") return { ok: false as const, status: 403 as const };
  return { ok: true as const, me };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" } as any,
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ admins });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const body = await request.json().catch(() => null) as { email?: string; name?: string; password?: string } | null;
  const email = body?.email?.trim();
  const name = body?.name?.trim() || null;
  const password = body?.password;
  if (!email || !password) return NextResponse.json({ error: "Missing email or password" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, password: hash, role: "ADMIN" } as any });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
}
