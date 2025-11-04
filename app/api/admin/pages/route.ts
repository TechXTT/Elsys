import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const where: any = {};
    if (locale) where.locale = locale;
    if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }];

    const pages = await (prisma as any).page.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, locale: true, title: true, published: true, updatedAt: true },
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
      slug: string; locale: string; title: string; excerpt?: string | null; bodyMarkdown?: string | null; published?: boolean;
    } | null;
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    const slug = (body.slug || "").trim().replace(/^\/+|\/+$/g, "");
    const locale = (body.locale || "").trim();
    const title = (body.title || "").trim();
    if (!slug || !locale || !title) return NextResponse.json({ error: "slug, locale and title are required" }, { status: 400 });

    const created = await (prisma as any).page.create({
      data: {
        slug,
        locale,
        title,
        excerpt: body.excerpt ?? null,
        bodyMarkdown: body.bodyMarkdown ?? null,
        published: body.published ?? true,
        authorId: userId,
      },
      select: { id: true },
    } as any);
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
