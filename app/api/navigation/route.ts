import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultLocale } from "@/i18n/config";

// Simple per-locale navigation cache (tree + legacy flag)
interface NavCacheEntry { items: any[]; legacy: boolean; expires: number }
const NAV_CACHE = new Map<string, NavCacheEntry>();
const NAV_TTL_MS = 60_000; // 60s; tune based on update frequency
export function invalidateNavigationCache(locale?: string) {
  if (locale) NAV_CACHE.delete(locale); else NAV_CACHE.clear();
}

type PageRow = {
  id: string;
  groupId: string | null;
  parentId: string | null;
  order: number;
  slug: string | null;
  visible: boolean;
  externalUrl: string | null;
  routePath: string | null;
  routeOverride: string | null;
  navLabel: string | null;
  kind: string;
  locale: string;
};

function buildGroupedTree(rows: PageRow[], locale: string) {
  if (!rows.length) return [] as any[];
  const byId = new Map<string, PageRow>(rows.map((row) => [row.id, row]));
  const groups = new Map<string, { nodes: PageRow[]; parentGroupId: string | null }>();
  for (const row of rows) {
    const gid = row.groupId ?? row.id;
    if (!groups.has(gid)) groups.set(gid, { nodes: [], parentGroupId: null });
    groups.get(gid)!.nodes.push(row);
  }
  for (const row of rows) {
    const gid = row.groupId ?? row.id;
    const parent = row.parentId ? byId.get(row.parentId) : null;
    const parentGroupId = parent ? (parent.groupId ?? parent.id) : null;
    const info = groups.get(gid)!;
    if (parentGroupId && info.parentGroupId === null) info.parentGroupId = parentGroupId;
  }
  const canonicalOrder = new Map<string, number>();
  for (const row of rows) {
    const gid = row.groupId ?? row.id;
    if (row.locale === defaultLocale) {
      canonicalOrder.set(gid, row.order);
    } else if (!canonicalOrder.has(gid)) {
      canonicalOrder.set(gid, row.order);
    }
  }
  const nodesByGroup = new Map<string, any>();
  for (const [gid, info] of groups) {
    const variant = info.nodes.find((n) => n.locale === locale)
      ?? info.nodes.find((n) => n.locale === defaultLocale)
      ?? info.nodes[0];
    const order = canonicalOrder.get(gid) ?? variant.order ?? 0;
    nodesByGroup.set(gid, { ...variant, order, children: [] as any[] });
  }
  const roots: any[] = [];
  for (const [gid, info] of groups) {
    const node = nodesByGroup.get(gid)!;
    const parentGroupId = info.parentGroupId;
    if (parentGroupId && nodesByGroup.has(parentGroupId)) {
      nodesByGroup.get(parentGroupId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: any[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((child) => sort(child.children));
  };
  sort(roots);
  return roots;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const localeParam = searchParams.get("locale");
    const locale = (localeParam || defaultLocale) as string;
    const cached = NAV_CACHE.get(locale);
    if (cached && Date.now() < cached.expires) {
      return NextResponse.json({ items: cached.items, legacy: cached.legacy, cached: true });
    }
    // Fetch locale-specific pages and build tree (unified model). Fallback to legacy NavigationItem if no pages yet.
    const localesToFetch = locale === defaultLocale ? [locale] : [locale, defaultLocale];
    const pages = await (prisma as any).page.findMany({
      where: { locale: { in: localesToFetch } },
      orderBy: [ { parentId: "asc" }, { order: "asc" } ],
      select: { id: true, groupId: true, parentId: true, order: true, slug: true, visible: true, externalUrl: true, routePath: true, routeOverride: true, navLabel: true, kind: true, locale: true }
    });

    let roots: any[] = [];
    let usingLegacy = false;
    if (pages.length) {
      roots = buildGroupedTree(pages, locale);
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
    NAV_CACHE.set(locale, { items: tree, legacy: usingLegacy, expires: Date.now() + NAV_TTL_MS });
    return NextResponse.json({ items: tree, legacy: usingLegacy, cached: false });
  } catch (err: any) {
    console.error("/api/navigation GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
