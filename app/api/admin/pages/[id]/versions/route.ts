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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const versions = await (prisma as any).pageVersion.findMany({
      where: { pageId: params.id },
      orderBy: { version: "desc" },
      select: { id: true, version: true, published: true, createdAt: true, createdById: true },
    });
    return NextResponse.json({ versions });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/pages/[id]/versions GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Restore to a previous version by cloning it as a new published snapshot and pointing currentVersionId
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const userId = (session!.user as any).id as string;
    const body = (await req.json().catch(() => null)) as { versionId?: string } | null;
    if (!body?.versionId) return NextResponse.json({ error: "versionId required" }, { status: 400 });
    const src = await (prisma as any).pageVersion.findUnique({ where: { id: body.versionId } });
    if (!src || src.pageId !== params.id) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    const page = await (prisma as any).page.findUnique({ where: { id: params.id }, select: { id: true, slug: true, locale: true } });
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    const versionCount = await (prisma as any).pageVersion.count({ where: { pageId: params.id } });
    const version = versionCount + 1;
    const pv = await (prisma as any).pageVersion.create({
      data: {
        pageId: params.id,
        version,
        title: src.title,
        excerpt: src.excerpt,
        bodyMarkdown: src.bodyMarkdown,
        blocks: src.blocks,
        published: true,
        createdById: userId,
      },
      select: { id: true },
    });
    await (prisma as any).page.update({
      where: { id: params.id },
      data: { currentVersionId: pv.id, title: src.title, excerpt: src.excerpt, bodyMarkdown: src.bodyMarkdown, blocks: src.blocks, published: true },
    });
    await recordAudit({ req, userId, action: "PAGE_ROLLBACK", entity: "Page", entityId: params.id, details: { restoredFrom: src.id, version } });
    try { invalidatePageCache(page.slug, page.locale as any); } catch {}
    return NextResponse.json({ ok: true, version });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/pages/[id]/versions POST error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
