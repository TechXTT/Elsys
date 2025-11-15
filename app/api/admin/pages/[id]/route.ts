import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidatePageCache } from "@/lib/cms/compile";
import { recordAudit } from "@/lib/audit";

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
    const userId = (session!.user as any).id as string;
    const body = (await req.json().catch(() => null)) as {
      slug?: string; locale?: string; title?: string; excerpt?: string | null; bodyMarkdown?: string | null; blocks?: unknown; published?: boolean;
    } | null;
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    const data: any = {};
    if (body.slug !== undefined) {
      const slug = (body.slug || "").trim().replace(/^\/+|\/+$/g, "");
      data.slug = slug;
      // validations
      if (slug) {
        const reserved = new Set(["api", "admin", "one-time", "auth"]);
        const top = slug.split("/")[0];
        if (reserved.has(top)) return NextResponse.json({ error: `Slug top-level segment '${top}' is reserved` }, { status: 400 });
        const loc = (body.locale !== undefined ? (body.locale || "").trim() : undefined) ?? undefined;
        const page = await (prisma as any).page.findUnique({ where: { id: params.id }, select: { locale: true } });
        const locale = (loc || page?.locale || "").trim();
        if (slug.startsWith("novini/")) {
          const newsId = slug.split("/")[1];
          if (newsId) {
            const exists = await (prisma as any).newsPost.findUnique({ where: { id_locale: { id: newsId, locale } } });
            if (exists) return NextResponse.json({ error: "Slug collides with an existing news article" }, { status: 409 });
          }
        }
      }
    }
    if (body.locale !== undefined) data.locale = (body.locale || "").trim();
    if (body.title !== undefined) data.title = (body.title || "").trim();
    if (body.excerpt !== undefined) data.excerpt = body.excerpt ?? null;
    if (body.bodyMarkdown !== undefined) data.bodyMarkdown = body.bodyMarkdown ?? null;
    if (body.blocks !== undefined) data.blocks = body.blocks as any;
    if (body.published !== undefined) data.published = !!body.published;

    const updated = await (prisma as any).page.update({ where: { id: params.id }, data, select: { id: true, slug: true, locale: true, title: true, excerpt: true, bodyMarkdown: true, blocks: true, published: true } });
    // Create version snapshot
    try {
      const versionCount = await (prisma as any).pageVersion.count({ where: { pageId: updated.id } });
      const version = versionCount + 1;
      const pv = await (prisma as any).pageVersion.create({
        data: {
          pageId: updated.id,
          version,
          title: updated.title,
          excerpt: updated.excerpt,
          bodyMarkdown: updated.bodyMarkdown,
          blocks: updated.blocks,
          published: !!updated.published,
          createdById: userId,
        },
        select: { id: true, published: true },
      });
      if (pv.published) {
        await (prisma as any).page.update({ where: { id: updated.id }, data: { currentVersionId: pv.id } });
      }
      await recordAudit({ req, userId, action: "PAGE_UPDATE", entity: "Page", entityId: updated.id, details: { version, published: pv.published } });
    } catch (e) {
      console.error("create page version snapshot failed", e);
    }
    try { invalidatePageCache(updated.slug, updated.locale as any); } catch {}
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
