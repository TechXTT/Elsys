import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { invalidatePageCache } from "@/lib/cms/compile";

function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.id || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || undefined;
    const q = searchParams.get("q") || undefined;
    const slug = searchParams.get("slug") || undefined;
    const groupId = searchParams.get("groupId") || undefined;

    const where: any = {};
    if (locale) where.locale = locale;
    if (slug) where.slug = slug; // Exact match for slug
    if (groupId) where.groupId = groupId; // Exact match for groupId (for locale switching)
    if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }];

    const pages = await (prisma as any).page.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, locale: true, groupId: true, title: true, published: true, updatedAt: true },
    } as any);
    return NextResponse.json({ pages });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/pages GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const userId = (session!.user as any).id as string;
    const body = (await req.json().catch(() => null)) as {
      slug: string; locale: string; title: string; excerpt?: string | null; bodyMarkdown?: string | null; blocks?: unknown; published?: boolean;
    } | null;
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    const slug = (body.slug || "").trim().replace(/^\/+|\/+$/g, "");
    const locale = (body.locale || "").trim();
    const title = (body.title || "").trim();
    if (!slug || !locale || !title) return NextResponse.json({ error: "slug, locale and title are required" }, { status: 400 });

    // reserved top-level segments
    const reserved = new Set(["api", "admin", "one-time", "auth"]);
    const top = slug.split("/")[0];
    if (reserved.has(top)) return NextResponse.json({ error: `Slug top-level segment '${top}' is reserved` }, { status: 400 });

    // prevent collision with news URLs (/novini/:id)
    if (slug.startsWith("novini/")) {
      const newsId = slug.split("/")[1];
      if (newsId) {
        const exists = await (prisma as any).newsPost.findUnique({ where: { id_locale: { id: newsId, locale } } });
        if (exists) return NextResponse.json({ error: "Slug collides with an existing news article" }, { status: 409 });
      }
    }

    const created = await (prisma as any).page.create({
      data: {
        slug,
        locale,
        title,
        excerpt: body.excerpt ?? null,
        bodyMarkdown: body.bodyMarkdown ?? null,
        blocks: body.blocks as any,
        published: body.published ?? true,
        authorId: userId,
      },
      select: { id: true },
    } as any);
    // Create initial version snapshot
    try {
      const versionCount = await (prisma as any).pageVersion.count({ where: { pageId: created.id } });
      const version = versionCount + 1;
      const pv = await (prisma as any).pageVersion.create({
        data: {
          pageId: created.id,
          version,
          title,
          excerpt: body.excerpt ?? null,
          bodyMarkdown: body.bodyMarkdown ?? null,
          blocks: (body.blocks as any) ?? null,
          published: !!(body.published ?? true),
          createdById: userId,
        },
        select: { id: true, published: true },
      });
      if (pv.published) {
        await (prisma as any).page.update({ where: { id: created.id }, data: { currentVersionId: pv.id } });
      }
      await recordAudit({ req, userId, action: "PAGE_CREATE", entity: "Page", entityId: created.id, details: { slug, locale, version } });
    } catch (e) {
      console.error("create page version snapshot failed", e);
    }
    // Invalidate compile cache for this slug/locale
    try { invalidatePageCache(slug, locale as any); } catch {}
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "A page with this slug and locale already exists" }, { status: 409 });
    }
    console.error("/api/admin/pages POST error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
