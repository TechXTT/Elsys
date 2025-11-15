import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function sanitizeSegment(s?: string | null) {
  return (s || "").trim().replace(/^\/+|\/+$/g, "");
}

function normalizeRouteBasePath(p: string) {
  const s = sanitizeSegment(p);
  return s.replace(/^(app|pages)\//, "");
}

// GET /api/route-alias?locale=bg&path=novini or novini/foo/bar
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = sanitizeSegment(searchParams.get("locale"));
    const path = sanitizeSegment(searchParams.get("path"));
    if (!locale || !path) return NextResponse.json({ target: null });

    // Support nested paths: treat the first segment as the alias, the rest as remainder
    const parts = path.split('/').filter(Boolean);
    const aliasSeg = parts[0];
    const remainderSegs = parts.slice(1);

    const alias = await (prisma as any).page.findFirst({
      where: {
        locale,
        kind: 'ROUTE',
        routeOverride: { in: [aliasSeg, `/${aliasSeg}`] },
      },
      select: { routePath: true, slug: true },
    }).catch(() => null);
    if (!alias || !alias.routePath) return NextResponse.json({ target: null });

    const own = sanitizeSegment(alias.slug || "");
    let base = normalizeRouteBasePath(alias.routePath);

    const hasCatchAll = /\[\.\.\.[^\]]+\]/.test(base);
    const hasSingle = /\[[^\]]+\]/.test(base);
    const remainder = sanitizeSegment(remainderSegs.join('/'));

    if (hasCatchAll) {
      // Fill [...slug] with all remaining segments or own slug
      const fill = remainder || own || '';
      base = base.replace(/\[\.\.\.[^\]]+\]/g, fill);
    } else if (hasSingle) {
      // Fill [slug] with first remainder or own
      const first = sanitizeSegment(remainderSegs[0] || own || '');
      base = base.replace(/\[[^\]]+\]/g, first);
      // Append any tail remainder beyond the first
      if (remainderSegs.length > 1) {
        base = [base, remainderSegs.slice(1).join('/')].filter(Boolean).join('/');
      }
    } else {
      // Static route base: append remainder if provided; else fallback to own slug
      if (remainder) base = [base, remainder].filter(Boolean).join('/');
      else if (own) base = [base, own].filter(Boolean).join('/');
    }

    return NextResponse.json({ target: sanitizeSegment(base) });
  } catch (err) {
    return NextResponse.json({ target: null });
  }
}
