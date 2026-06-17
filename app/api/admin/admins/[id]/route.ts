import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/auth/api-guard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { wouldRemoveLastAdmin, LAST_ADMIN_ERROR } from "@/lib/auth/guard";

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
  const __g = await apiGuard("roles:manage"); if (__g instanceof NextResponse) return __g;
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const id = params.id;
  const body = await request.json().catch(() => null) as { role?: "ADMIN" | "USER"; name?: string } | null;
  if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });

  const data: any = {};
  if (body.role) data.role = body.role;
  if (body.name !== undefined) data.name = body.name;

  // Last-admin invariant: never demote the final remaining ADMIN.
  if (body.role && body.role !== "ADMIN" && (await wouldRemoveLastAdmin(id))) {
    await recordAudit({ req: request, userId: auth.me.id, action: "ADMIN_UPDATE_BLOCKED", entity: "User", entityId: id, details: { reason: "last-admin" } }).catch(() => {});
    return NextResponse.json({ error: LAST_ADMIN_ERROR }, { status: 409 });
  }

  const user = await prisma.user.update({ where: { id }, data: data as any });

  try {
    await recordAudit({
      req: request,
      userId: auth.me.id,
      action: "ADMIN_UPDATE",
      entity: "User",
      entityId: id,
      details: { fields: Object.keys(data) },
    });
  } catch {}

  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: (user as any).role });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const __g = await apiGuard("roles:manage"); if (__g instanceof NextResponse) return __g;
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const id = params.id;
  if (auth.me.id === id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  // Last-admin invariant: never delete the final remaining ADMIN.
  if (await wouldRemoveLastAdmin(id)) {
    await recordAudit({ req: _request, userId: auth.me.id, action: "ADMIN_DELETE_BLOCKED", entity: "User", entityId: id, details: { reason: "last-admin" } }).catch(() => {});
    return NextResponse.json({ error: LAST_ADMIN_ERROR }, { status: 409 });
  }

  await prisma.user.delete({ where: { id } });

  try {
    await recordAudit({
      req: _request,
      userId: auth.me.id,
      action: "ADMIN_DELETE",
      entity: "User",
      entityId: id,
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
