import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNewsPostVersions, restoreNewsPostVersion } from "@/lib/news-versions";
import { recordAudit } from "@/lib/audit";

function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.id || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

/**
 * GET /api/admin/news/[id]/versions
 * Get version history for a news post
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);

    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || undefined;

    const versions = await getNewsPostVersions(params.id, locale as any);

    return NextResponse.json({ versions });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error(`/api/admin/news/${params.id}/versions GET error`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/news/[id]/versions/restore
 * Restore a specific version of a news post
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const userId = (session!.user as any).id as string;

    const body = await req.json().catch(() => null);
    if (!body || typeof body.version !== "number") {
      return NextResponse.json({ error: "Missing version number" }, { status: 400 });
    }

    const locale = body.locale || undefined;
    const versionNumber = body.version;

    const result = await restoreNewsPostVersion({
      slug: params.id,
      versionNumber,
      locale,
      userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Restore failed" }, { status: 400 });
    }

    try {
      await recordAudit({
        req,
        userId,
        action: "newsPost.version.restore",
        entity: "newsPost",
        entityId: params.id,
        details: { version: versionNumber, newVersion: result.newVersion, locale },
      });
    } catch {}

    return NextResponse.json({ success: true, newVersion: result.newVersion });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error(`/api/admin/news/${params.id}/versions POST error`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
