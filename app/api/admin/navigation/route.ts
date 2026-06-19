import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/auth/api-guard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { locales as supportedLocales, defaultLocale } from "@/i18n/config";
import { invalidateNavigationCache } from "@/lib/navigation-cache";
import { invalidateNavigationTree } from "@/lib/navigation-build";
import { recordAudit } from "@/lib/audit";
import { revalidatePublicPages } from "@/lib/revalidate";
import { bumpCacheVersion } from "@/lib/cache";

const NAV_LOCALES = Array.from(supportedLocales);
const NAV_PAGE_SELECT = {
  id: true,
  groupId: true,
  parentId: true,
  order: true,
  slug: true,
  externalUrl: true,
  routePath: true,
  routeOverride: true,
  visible: true,
  accessRole: true,
  navLabel: true,
  kind: true,
  locale: true,
  title: true,
  excerpt: true,
  bodyMarkdown: true,
  blocks: true,
  published: true,
  authorId: true,
} as const;

type NavPageRow = {
  id: string;
  groupId: string | null;
  parentId: string | null;
  order: number;
  slug: string | null;
  externalUrl: string | null;
  routePath: string | null;
  routeOverride: string | null;
  visible: boolean;
  accessRole: string | null;
  navLabel: string | null;
  kind: string;
  locale: string;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string | null;
  blocks: any;
  published: boolean;
  authorId: string | null;
};

function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.id || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

function sortTree(nodes: any[]) { nodes.sort((a,b)=>a.order-b.order); nodes.forEach(n=> sortTree(n.children)); }

export async function GET(req: Request) {
  const __g = await apiGuard("nav:edit"); if (__g instanceof NextResponse) return __g;
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const { searchParams } = new URL(req.url);
    const requestedLocaleParam = searchParams.get("locale");
    const preferredLocale = NAV_LOCALES.find((loc) => loc === requestedLocaleParam) ?? defaultLocale;
    // Read-only projection: GET must be side-effect-free. We DO NOT create
    // missing-locale rows (that was the ghost factory — it cloned `${slug}-${loc}`
    // pages with swapped labels on every load). A group missing a locale is
    // projected as a virtual "needs translation" node using the fallback-locale
    // label; real locale versions are created ONLY by the explicit translate /
    // create-version action.
    const all = await fetchNavPageRows();
    const groups = new Map<string, any[]>();
    const groupByPageId = new Map<string, string>(); // page id -> its group id
    for (const p of all) {
      const gid = p.groupId ?? p.id; // fallback during transition
      if (!groups.has(gid)) groups.set(gid, []);
      groups.get(gid)!.push(p);
      groupByPageId.set(p.id, gid);
    }
    // Build nodes using primary locale page per group (prefer 'bg', else any)
    const nodesById = new Map<string, any>();
    const nodes: any[] = [];
    // map groupId -> chosen primary page
    const primaryByGroup = new Map<string, any>();
    for (const [gid, arr] of groups) {
      const primary = arr.find((x) => x.locale === preferredLocale)
        || arr.find((x) => x.locale === defaultLocale)
        || arr[0];
      // synthesize x-locale maps
      const idsByLocale: Record<string,string> = {};
      const slugByLocale: Record<string,string|null> = {};
      const labelByLocale: Record<string,string|null> = {};
      const routeOverrideByLocale: Record<string,string|null> = {};
      const routePathByLocale: Record<string, string | null> = {};
      const externalUrlByLocale: Record<string, string | null> = {};
      for (const v of arr) {
        idsByLocale[v.locale] = v.id;
        slugByLocale[v.locale] = v.slug;
        labelByLocale[v.locale] = v.navLabel;
        routeOverrideByLocale[v.locale] = v.routeOverride;
        routePathByLocale[v.locale] = v.routePath;
        externalUrlByLocale[v.locale] = v.externalUrl;
      }
      // Virtual projection for locales with no real row: show the fallback-locale
      // label (so e.g. a bg-only page still appears in the EN tab) and flag it as
      // needing translation. No row is created — idsByLocale stays absent for it.
      const needsTranslationByLocale: Record<string, boolean> = {};
      for (const loc of NAV_LOCALES) {
        if (idsByLocale[loc]) continue;
        needsTranslationByLocale[loc] = true;
        if (labelByLocale[loc] == null) labelByLocale[loc] = primary.navLabel ?? primary.title ?? null;
        if (slugByLocale[loc] == null) slugByLocale[loc] = primary.slug ?? null;
      }
      const node = { ...primary, idsByLocale, slugByLocale, labelByLocale, routeOverrideByLocale, routePathByLocale, externalUrlByLocale, needsTranslationByLocale, children: [] as any[] };
      nodesById.set(primary.id, node);
      primaryByGroup.set(gid, node);
    }
    for (const node of nodesById.values()) {
      // Resolve the parent by its GROUP, not a raw page id. A virtual child's
      // primary is the fallback-locale row, so node.parentId is THAT locale's
      // parent id — which won't match a parent node keyed by a different locale's
      // id (the bug: EN children orphaning to root under a real EN parent). The
      // groupId-merge unifies bg+en of a page, so the parent's group always
      // resolves to whichever node represents that parent in this locale.
      const parentGid = node.parentId ? groupByPageId.get(node.parentId) : null;
      const parentNode = parentGid ? primaryByGroup.get(parentGid) : null;
      if (parentNode && parentNode !== node) parentNode.children.push(node);
      else nodes.push(node);
    }
    sortTree(nodes);
    return NextResponse.json({ items: nodes });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/navigation GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const __g = await apiGuard("nav:edit"); if (__g instanceof NextResponse) return __g;
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const body = (await req.json().catch(() => null)) as {
      parentId?: string | null;
      slugByLocale?: Record<string, string | null>;
      externalByLocale?: Record<string, string | null>;
      routePathByLocale?: Record<string, string | null>;
      routeSlugByLocale?: Record<string, string | null>;
      routeOverrideByLocale?: Record<string, string | null>;
      navLabelByLocale?: Record<string, string | null>;
      kind?: string | null;
      visible?: boolean;
      accessRole?: string | null;
    } | null;
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    const slugByLocale = body.slugByLocale ?? {};
    const navLabelByLocale = body.navLabelByLocale ?? {};
    const externalByLocale = body.externalByLocale ?? {};
    const routePathByLocale = body.routePathByLocale ?? {};
    const routeSlugByLocale = body.routeSlugByLocale ?? {};
    const routeOverrideByLocale = body.routeOverrideByLocale ?? {};
    const kind = body.kind ?? 'PAGE';
    const visible = body.visible ?? true;

    if (kind === 'LINK') {
      const hasUrl = NAV_LOCALES.some((loc) => externalByLocale[loc]);
      if (!hasUrl) return NextResponse.json({ error: "External URL required for LINK" }, { status: 400 });
    } else if (kind === 'ROUTE') {
      const hasRoute = NAV_LOCALES.some((loc) => routePathByLocale[loc] || slugByLocale[loc]);
      if (!hasRoute) return NextResponse.json({ error: "routePath required for ROUTE" }, { status: 400 });
    } else {
      const hasSlug = NAV_LOCALES.some((loc) => slugByLocale[loc]);
      if (!hasSlug) return NextResponse.json({ error: "Slug segment required" }, { status: 400 });
    }
    const locales = NAV_LOCALES.length ? NAV_LOCALES : ['bg'];
    const groupId = `G|${crypto.randomUUID()}`;
    // Map parentId by locale via parent's group id if provided
    let parentGroupId: string | null = null;
    if (body.parentId) {
      const p = await (prisma as any).page.findUnique({ where: { id: body.parentId }, select: { groupId: true } });
      parentGroupId = p?.groupId ?? null;
    }
    const createdIds: string[] = [];
    await (prisma as any).$transaction(async (tx: any) => {
      for (const loc of locales) {
        let parentId: string | null = null;
        if (parentGroupId) {
          const parentLoc = await tx.page.findFirst({ where: { groupId: parentGroupId, locale: loc }, select: { id: true } });
          parentId = parentLoc?.id ?? null;
        }
        const slugValue = slugByLocale[loc] || slugByLocale[defaultLocale] || '';
        const navLabelValue = navLabelByLocale[loc] || navLabelByLocale[defaultLocale] || slugValue || 'Untitled';
        const routeOverrideValue = routeOverrideByLocale[loc] || routeOverrideByLocale[defaultLocale] || null;
        const routePathValue = routePathByLocale[loc] || routePathByLocale[defaultLocale] || null;
        const routeSlugValue = routeSlugByLocale[loc] || routeSlugByLocale[defaultLocale] || null;
        const externalValue = externalByLocale[loc] || externalByLocale[defaultLocale] || null;

        const created = await tx.page.create({
          data: {
            locale: loc,
            parentId,
            slug: kind === 'LINK' ? (externalValue || '') : (kind === 'ROUTE' ? routeSlugValue || slugValue || '' : slugValue || ''),
            externalUrl: kind === 'LINK' ? (externalValue || null) : null,
            routePath: kind === 'ROUTE' ? (routePathValue || slugValue || null) : null,
            routeOverride: routeOverrideValue,
            navLabel: navLabelValue,
            kind,
            visible,
            order: 9999,
            title: navLabelValue,
            published: true,
            status: "PUBLISHED",
            groupId,
          },
          select: { id: true }
        });
        createdIds.push(created.id);
      }
    });
    // Normalize orders for each locale/parent
    for (const loc of locales) {
      const parentForLoc = parentGroupId ? (await (prisma as any).page.findFirst({ where: { groupId: parentGroupId, locale: loc }, select: { id: true } }))?.id ?? null : null;
      await normalizeParentOrders(parentForLoc, loc);
    }
    for (const loc of locales) {
      invalidateNavigationCache(loc);
      await invalidateNavigationTree(loc);
    }
    try {
      await recordAudit({
        req,
        userId: (session!.user as any).id as string,
        action: "NAV_CREATE",
        entity: "Page",
        entityId: createdIds[0] ?? groupId,
        details: { groupId, kind, createdIds },
      });
    } catch {}
    // ROUTE pages define URL aliases — bump the routes cache before revalidating.
    await bumpCacheVersion("routes");
    try {
      await revalidatePublicPages();
    } catch (e) {
      console.error("navigation create revalidation failed", e);
    }
    return NextResponse.json({ groupId }, { status: 201 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/navigation POST error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function normalizeParentOrders(parentId: string | null, locale: string) {
  const where = parentId === null ? { parentId: null as any, locale } : { parentId, locale };
  const siblings = await (prisma as any).page.findMany({
    where,
    orderBy: [
      { order: 'asc' },
      { updatedAt: 'desc' },
      { id: 'asc' },
    ],
    select: { id: true },
  });
  const tx: any[] = [];
  siblings.forEach((s: any, i: number) => {
    tx.push((prisma as any).page.update({ where: { id: s.id }, data: { order: i } }));
  });
  if (tx.length) await (prisma as any).$transaction(tx);
}

async function fetchNavPageRows(): Promise<NavPageRow[]> {
  return await (prisma as any).page.findMany({ orderBy: [{ parentId: 'asc' }, { order: 'asc' }], select: NAV_PAGE_SELECT });
}

