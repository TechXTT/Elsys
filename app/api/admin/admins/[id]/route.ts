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
  return { ok: true as const, me };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const id = params.id;
  const body = await request.json().catch(() => null) as { role?: "ADMIN" | "USER"; name?: string } | null;
  if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

  const data: any = {};
  if (body.role) data.role = body.role;
  if (body.name !== undefined) data.name = body.name;

  const user = await prisma.user.update({ where: { id }, data: data as any });
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: (user as any).role });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const id = params.id;
  if (auth.me.id === id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
