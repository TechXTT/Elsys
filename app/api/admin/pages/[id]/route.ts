import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.id || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const page = await (prisma as any).page.findUnique({ where: { id: params.id } });
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/pages/[id] GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const body = (await req.json().catch(() => null)) as {
      slug?: string; locale?: string; title?: string; excerpt?: string | null; bodyMarkdown?: string | null; published?: boolean;
    } | null;
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    const data: any = {};
    if (body.slug !== undefined) data.slug = (body.slug || "").trim().replace(/^\/+|\/+$/g, "");
    if (body.locale !== undefined) data.locale = (body.locale || "").trim();
    if (body.title !== undefined) data.title = (body.title || "").trim();
    if (body.excerpt !== undefined) data.excerpt = body.excerpt ?? null;
    if (body.bodyMarkdown !== undefined) data.bodyMarkdown = body.bodyMarkdown ?? null;
    if (body.published !== undefined) data.published = !!body.published;

    const updated = await (prisma as any).page.update({ where: { id: params.id }, data, select: { id: true } });
    return NextResponse.json({ id: updated.id });
  } catch (err: any) {
    if (err instanceof Response) return err;
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug+locale must be unique" }, { status: 409 });
    console.error("/api/admin/pages/[id] PUT error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    await (prisma as any).page.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/pages/[id] DELETE error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
