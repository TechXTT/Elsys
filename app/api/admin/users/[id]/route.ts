import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.id) {
    return { ok: false as const, status: 401 as const };
  }
  const me = await prisma.user.findUnique({ where: { id: (session.user as any).id as string } });
  if (!me || (me as any).role !== "ADMIN") return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true, name: true } as any });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    gradeLevel?: number | null;
    gradeClass?: "A" | "B" | "V" | "G" | null;
    role?: "ADMIN" | "USER";
  } | null;
  if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

  const data: any = {};
  if (body.email !== undefined) data.email = body.email?.trim().toLowerCase() || null;
  if (body.firstName !== undefined) data.firstName = body.firstName?.trim() || null;
  if (body.lastName !== undefined) data.lastName = body.lastName?.trim() || null;
  if (body.gradeLevel !== undefined) data.gradeLevel = body.gradeLevel;
  if (body.gradeClass !== undefined) data.gradeClass = body.gradeClass;
  if (body.role) data.role = body.role;

  const user = await prisma.user.update({ where: { id: params.id }, data: data as any, select: { id: true } });
  return NextResponse.json({ ok: true, id: user.id });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
