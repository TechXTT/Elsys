import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultLocale } from "@/i18n/config";

// Build hierarchical tree from unified Page rows (single locale)
function buildPageTree(pages: any[]) {
  const byId = new Map<string, any>();
  const roots: any[] = [];
  pages.forEach((p) => byId.set(p.id, { ...p, children: [] as any[] }));
  pages.forEach((p) => {
    const node = byId.get(p.id)!;
    if (p.parentId && byId.has(p.parentId)) byId.get(p.parentId)!.children.push(node); else roots.push(node);
  });
  const sortTree = (nodes: any[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);
  return roots;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const localeParam = searchParams.get("locale");
    const locale = (localeParam || defaultLocale) as string;
    // Fetch locale-specific pages and build tree (unified model). Fallback to legacy NavigationItem if no pages yet.
    const pages = await (prisma as any).page.findMany({
      where: { locale },
      orderBy: [ { parentId: "asc" }, { order: "asc" } ],
      select: { id: true, parentId: true, order: true, slug: true, visible: true, externalUrl: true, routePath: true, routeOverride: true, navLabel: true, kind: true }
    });

    let roots: any[] = [];
    let usingLegacy = false;
    if (pages.length) {
      roots = buildPageTree(pages);
    } else {
      // Transitional legacy support
      usingLegacy = true;
      const legacy = await (prisma as any).navigationItem.findMany({ orderBy: [{ parentId: "asc" }, { order: "asc" }] });
      roots = (function buildLegacy(items: any[]) { const byId = new Map(); const r: any[] = []; items.forEach(i=>byId.set(i.id,{...i,children:[] })); items.forEach(i=>{ const n=byId.get(i.id)!; if(i.parentId&&byId.has(i.parentId)) byId.get(i.parentId).children.push(n); else r.push(n); }); const sort=(ns:any[])=>{ ns.sort((a,b)=>a.order-b.order); ns.forEach(n=>sort(n.children)); }; sort(r); return r; })(legacy);
    }

    function filterVisible(nodes: any[], ancestorHidden = false): any[] {
      const out: any[] = [];
      for (const n of nodes) {
        const selfHidden = !n.visible || ancestorHidden;
        if (!selfHidden) out.push({ ...n, children: filterVisible(n.children || [], selfHidden) });
      }
      return out.sort((a, b) => a.order - b.order);
    }
    const visibleTree = filterVisible(roots);

    function sanitizeSegment(s?: string | null) { return (s || "").trim().replace(/^\/+|\/+$/g, ""); }

    function fullSlugSegments(slug: string) {
      // Support legacy full slugs containing '/'
      return slug.split('/').filter(Boolean).map(sanitizeSegment);
    }

    function normalizeRouteBasePath(p: string) {
      const s = sanitizeSegment(p);
      return s.replace(/^(app|pages)\//, "");
    }

    function mapWithPath(n: any, parentSegments: string[], inRoute: boolean, routeBase: string | null): any {
      const segs = fullSlugSegments(n.slug || "");
      const ownSeg = segs.length ? segs[segs.length - 1] : "";
      const label = (n.navLabel || ownSeg || n.externalUrl || '').trim();
      // Route override takes precedence (absolute route derived from override)
      if (n.routeOverride) {
        const overrideRaw = sanitizeSegment(n.routeOverride.replace(/^\/+/, ''));
        const own = fullSlugSegments(n.slug || '').join('/') || '';
        let base = overrideRaw;
        if (base.includes('[')) {
          base = base.replace(/\[\.\.\.(.+?)\]/g, (_m: string, _p1: string) => own || '' );
          base = base.replace(/\[(.+?)\]/g, (_m: string, _p1: string) => own || '' );
        } else if (own) {
          base = [base, own].filter(Boolean).join('/');
        }
        const href = `/${base}`;
        const children = (n.children || []).map((c: any) => mapWithPath(c, [], true, base));
        return { label, href, external: false, kind: n.kind, children };
      }
      // Entering a ROUTE node resets segment accumulation and sets route base
      if (n.kind === 'ROUTE') {
        const baseRaw = normalizeRouteBasePath(n.routePath || '');
        // Replace dynamic segments [slug], [id], or [...slug] with provided slug(s); else append slug
        const own = fullSlugSegments(n.slug || '').join('/') || '';
        let base = baseRaw;
        if (base.includes('[')) {
          base = base.replace(/\[\.\.\.(.+?)\]/g, (_m: string, _p1: string) => own || '' );
          base = base.replace(/\[(.+?)\]/g, (_m: string, _p1: string) => own || '' );
        } else if (own) {
          base = [base, own].filter(Boolean).join('/');
        }
        const href = `/${base}`;
        const children = (n.children || []).map((c: any) => mapWithPath(c, [], true, base));
        return { label, href, external: false, kind: n.kind, children };
      }
      const pathSegments = [...parentSegments, ownSeg].filter(Boolean);
      const fullPath = pathSegments.join('/');
      const href = n.externalUrl
        ? n.externalUrl
        : (n.kind === 'FOLDER'
            ? undefined
            : (inRoute && routeBase ? `/${routeBase}/${fullPath}` : `/${fullPath}`));
      const children = (n.children || []).map((c: any) => mapWithPath(c, pathSegments, inRoute, routeBase));
      return { label, href, external: !!n.externalUrl, kind: n.kind, children };
    }

    const tree = visibleTree.map((n: any) => mapWithPath(n, [], false, null));
    return NextResponse.json({ items: tree, legacy: usingLegacy });
  } catch (err: any) {
    console.error("/api/navigation GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
