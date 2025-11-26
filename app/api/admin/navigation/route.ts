import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { locales as supportedLocales, defaultLocale } from "@/i18n/config";
import { invalidateNavigationCache } from "@/lib/navigation-cache";
import { invalidateNavigationTree } from "@/lib/navigation-build";

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

const slugLocaleKey = (slug: string, locale: string) => `${locale}::${slug}`;

function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.id || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

function sortTree(nodes: any[]) { nodes.sort((a,b)=>a.order-b.order); nodes.forEach(n=> sortTree(n.children)); }

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const { searchParams } = new URL(req.url);
    const requestedLocaleParam = searchParams.get("locale");
    const preferredLocale = NAV_LOCALES.find((loc) => loc === requestedLocaleParam) ?? defaultLocale;
    // Ensure every navigation group has entries for all locales before building tree
    const all = await ensureNavigationLocaleCoverage();
    const groups = new Map<string, any[]>();
    for (const p of all) {
      const gid = p.groupId ?? p.id; // fallback during transition
      if (!groups.has(gid)) groups.set(gid, []);
      groups.get(gid)!.push(p);
    }
    // Build nodes using primary locale page per group (prefer 'bg', else any)
    const nodesById = new Map<string, any>();
    const nodes: any[] = [];
    // map groupId -> chosen primary page
    const primaryByGroup = new Map<string, any>();
    for (const [gid, arr] of groups) {
      let primary = arr.find((x) => x.locale === preferredLocale)
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
      const node = { ...primary, idsByLocale, slugByLocale, labelByLocale, routeOverrideByLocale, routePathByLocale, externalUrlByLocale, children: [] as any[] };
      nodesById.set(primary.id, node);
      primaryByGroup.set(gid, node);
    }
    for (const node of nodesById.values()) {
      const primaryParent = node.parentId ? nodesById.get(node.parentId) : null;
      if (primaryParent) primaryParent.children.push(node); else nodes.push(node);
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

async function ensureNavigationLocaleCoverage(): Promise<NavPageRow[]> {
  let rows = await fetchNavPageRows();
  if (!rows.length) return rows;
  const pageById = new Map<string, NavPageRow>(rows.map((row) => [row.id, row]));
  const groupInfo = new Map<string, { nodes: NavPageRow[]; parentGroupId: string | null }>();
  const localeIdsByGroup = new Map<string, Record<string, string>>();
  const missingGroupIds = new Set<string>();

  for (const row of rows) {
    const gid = row.groupId ?? row.id;
    if (!groupInfo.has(gid)) groupInfo.set(gid, { nodes: [], parentGroupId: null });
    const info = groupInfo.get(gid)!;
    info.nodes.push(row);
    const parent = row.parentId ? pageById.get(row.parentId) : null;
    const parentGroupId = parent ? (parent.groupId ?? parent.id) : null;
    if (parentGroupId && info.parentGroupId === null) info.parentGroupId = parentGroupId;
    const locMap = localeIdsByGroup.get(gid) ?? {};
    locMap[row.locale] = row.id;
    localeIdsByGroup.set(gid, locMap);
    if (!row.groupId) missingGroupIds.add(row.id);
  }

  const slugUsage = new Set<string>();
  for (const row of rows) {
    if (row.slug) slugUsage.add(slugLocaleKey(row.slug, row.locale));
  }

  let mutated = false;
  if (missingGroupIds.size) {
    mutated = true;
    await (prisma as any).$transaction(
      Array.from(missingGroupIds).map((id) => (prisma as any).page.update({ where: { id }, data: { groupId: id } }))
    );
    for (const row of rows) {
      if (!row.groupId) row.groupId = row.id;
    }
  }

  const depthCache = new Map<string, number>();
  const getDepth = (gid: string | null | undefined): number => {
    if (!gid) return 0;
    if (depthCache.has(gid)) return depthCache.get(gid)!;
    const parent = groupInfo.get(gid)?.parentGroupId ?? null;
    const depth = parent ? getDepth(parent) + 1 : 0;
    depthCache.set(gid, depth);
    return depth;
  };

  const sortedGroups = Array.from(groupInfo.keys()).sort((a, b) => getDepth(a) - getDepth(b));
  for (const gid of sortedGroups) {
    const info = groupInfo.get(gid)!;
    const locMap = localeIdsByGroup.get(gid) ?? {};
    const missingLocales = NAV_LOCALES.filter((loc) => !locMap[loc]);
    if (!missingLocales.length) continue;
    const template = info.nodes.find((n) => n.locale === defaultLocale) ?? info.nodes[0];
    if (!template) continue;
    for (const loc of missingLocales) {
      mutated = true;
      const parentLocaleId = info.parentGroupId ? (localeIdsByGroup.get(info.parentGroupId)?.[loc] ?? null) : null;
      const nextSlug = allocateCloneSlug(template.slug, loc, slugUsage);
      const created = await (prisma as any).page.create({
        data: {
          locale: loc,
          groupId: gid,
          parentId: parentLocaleId,
          slug: nextSlug,
          externalUrl: template.externalUrl,
          routePath: template.routePath,
          routeOverride: template.routeOverride,
          navLabel: template.navLabel,
          kind: template.kind,
          visible: template.visible,
          order: template.order,
          accessRole: template.accessRole,
          title: template.title,
          excerpt: template.excerpt,
          bodyMarkdown: template.bodyMarkdown,
          blocks: template.blocks,
          published: template.published,
          authorId: template.authorId,
        },
        select: NAV_PAGE_SELECT,
      });
      info.nodes.push(created);
      const updatedMap = localeIdsByGroup.get(gid) ?? {};
      updatedMap[loc] = created.id;
      localeIdsByGroup.set(gid, updatedMap);
      pageById.set(created.id, created);
    }
  }

  if (!mutated) return rows;
  return await fetchNavPageRows();
}

function allocateCloneSlug(baseSlug: string | null, locale: string, usage: Set<string>) {
  if (!baseSlug) return null;
  const cleanBase = baseSlug.trim();
  if (!cleanBase) return null;
  let candidate = cleanBase;
  let attempt = 0;
  while (usage.has(slugLocaleKey(candidate, locale))) {
    attempt += 1;
    candidate = `${cleanBase}-${locale}${attempt > 1 ? `-${attempt}` : ""}`;
  }
  usage.add(slugLocaleKey(candidate, locale));
  return candidate;
}
