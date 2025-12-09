import { defaultLocale, locales } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { getRedisClient, type RedisClient } from "@/lib/redis";

// Minimal Type reused across server/client
export interface UiNavNode { label: string; href?: string; external?: boolean; children?: UiNavNode[]; kind?: string }
export interface NavigationResult { items: UiNavNode[]; legacy: boolean }

type CacheEntry = { result: NavigationResult; expires: number };
const NAV_CACHE = new Map<string, CacheEntry>();
const NAV_CACHE_TTL_MS = 60_000; // in-memory fallback TTL
const NAV_REDIS_TTL_SECONDS = 300; // 5 minutes in Redis
const NAV_CACHE_PREFIX = "nav-tree";
const NAV_CACHE_VERSION_KEY = `${NAV_CACHE_PREFIX}:version`;
let versionHint = `v${Date.now()}`;

function getCacheKey(locale: string, version: string) { return `${NAV_CACHE_PREFIX}:${version}:${locale}`; }

async function getCacheVersion(redis: RedisClient | null) {
  if (!redis) return versionHint;
  const remote = await redis.get(NAV_CACHE_VERSION_KEY);
  if (remote) {
    versionHint = remote;
    return remote;
  }
  await redis.set(NAV_CACHE_VERSION_KEY, versionHint);
  return versionHint;
}

async function bumpCacheVersion(redis: RedisClient | null) {
  versionHint = `v${Date.now()}`;
  NAV_CACHE.clear();
  if (redis) await redis.set(NAV_CACHE_VERSION_KEY, versionHint);
}

async function readRedisEntry(redis: RedisClient | null, key: string) {
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NavigationResult;
  } catch {
    return null;
  }
}

async function writeRedisEntry(redis: RedisClient | null, key: string, result: NavigationResult) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(result), "EX", NAV_REDIS_TTL_SECONDS);
}

function sanitizeSegment(s?: string | null) { return (s || "").trim().replace(/^\/+|\/+$/g, ""); }
function normalizeRouteBasePath(p: string) { const s = sanitizeSegment(p); return s.replace(/^(app|pages)\//, ""); }

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
  accessRole: string | null;
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
  const sortChildren = (nodes: any[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((child) => sortChildren(child.children));
  };
  sortChildren(roots);
  return roots;
}

function filterVisible(nodes: any[]): any[] {
  return nodes.filter((n:any)=>n.visible).map((n:any)=>({ ...n, children: filterVisible(n.children||[]) }));
}

function filterAccessible(nodes: any[], role?: string | null): any[] {
  return nodes
    .filter((n: any) => !n.accessRole || (role && n.accessRole === role))
    .map((n: any) => ({ ...n, children: filterAccessible(n.children || [], role) }));
}

function mapWithPath(n: any, parentSegments: string[], inRoute: boolean, routeBase: string | null): UiNavNode {
  const segs = sanitizeSegment(n.slug||"").split('/').filter(Boolean);
  const ownSeg = segs[segs.length-1] || "";
  const label = (n.navLabel || ownSeg || n.externalUrl || '').trim();
  if (n.routeOverride) {
    let base = sanitizeSegment(n.routeOverride.replace(/^\/+/, ''));
    const own = segs.join('/') || '';
    if (base.includes('[')) {
      base = base.replace(/\[\.\.\.[^\]]+\]/g, own || '').replace(/\[[^\]]+\]/g, own || '');
    } else if (own) base = [base, own].filter(Boolean).join('/');
    return { label, href: `/${base}`, external: false, kind: n.kind, children: (n.children||[]).map((c:any)=>mapWithPath(c, [], true, base)) };
  }
  if (n.kind === 'ROUTE') {
    let base = normalizeRouteBasePath(n.routePath || '');
    const own = segs.join('/') || '';
    if (base.includes('[')) {
      base = base.replace(/\[\.\.\.[^\]]+\]/g, own || '').replace(/\[[^\]]+\]/g, own || '');
    } else if (own) base = [base, own].filter(Boolean).join('/');
    return { label, href: `/${base}`, external: false, kind: n.kind, children: (n.children||[]).map((c:any)=>mapWithPath(c, [], true, base)) };
  }
  const pathSegments = [...parentSegments, ownSeg].filter(Boolean);
  const fullPath = pathSegments.join('/');
  const href = n.externalUrl ? n.externalUrl : (n.kind === 'FOLDER' ? undefined : (inRoute && routeBase ? `/${routeBase}/${fullPath}` : `/${fullPath}`));
  return { label, href, external: !!n.externalUrl, kind: n.kind, children: (n.children||[]).map((c:any)=>mapWithPath(c, pathSegments, inRoute, routeBase)) };
}

async function buildNavigation(locale: string, role?: string | null): Promise<NavigationResult> {
  const localesToFetch = locale === defaultLocale ? [locale] : [locale, defaultLocale];
  const pages = await (prisma as any).page.findMany({
    where: { locale: { in: localesToFetch }, published: true },
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
    select: { id: true, groupId: true, parentId: true, order: true, slug: true, visible: true, externalUrl: true, routePath: true, routeOverride: true, navLabel: true, kind: true, locale: true, accessRole: true }
  });
  if (pages.length) {
    const tree = filterAccessible(filterVisible(buildGroupedTree(pages, locale)), role).map((n:any)=>mapWithPath(n, [], false, null));
    return { items: tree, legacy: false };
  }
  const legacyItems = await (prisma as any).navigationItem.findMany({ orderBy: [{ parentId: 'asc' }, { order: 'asc' }] });
  if (!legacyItems.length) return { items: [], legacy: false };
  const legacyTree = (function buildLegacy(items: any[]) {
    const byId = new Map();
    const roots: any[] = [];
    items.forEach((i) => byId.set(i.id, { ...i, children: [] }));
    items.forEach((i) => {
      const node = byId.get(i.id)!;
      if (i.parentId && byId.has(i.parentId)) byId.get(i.parentId).children.push(node); else roots.push(node);
    });
    const sort = (nodes: any[]) => { nodes.sort((a,b)=>a.order-b.order); nodes.forEach((n)=>sort(n.children)); };
    sort(roots);
    return roots;
  })(legacyItems);
  const tree = legacyTree.map((n:any)=>({ label: n.labels?.[locale] || n.slug || '', href: n.slug ? `/${n.slug}` : undefined, external: !!n.externalUrl, children: (n.children||[]).map((c:any)=>({ label: c.labels?.[locale] || c.slug || '', href: c.slug ? `/${c.slug}` : undefined, external: !!c.externalUrl })) }));
  return { items: tree, legacy: true };
}

export async function getNavigationTree(locale: string, options?: { forceRefresh?: boolean; role?: string | null }): Promise<NavigationResult> {
  const forceRefresh = options?.forceRefresh ?? false;
  const role = options?.role ?? null;
  const redis = getRedisClient();
  const version = await getCacheVersion(redis);
  const cacheSegment = role ? `${locale}::${role}` : locale;
  const key = getCacheKey(cacheSegment, version);
  if (!forceRefresh) {
    const cached = NAV_CACHE.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    const redisHit = await readRedisEntry(redis, key);
    if (redisHit) {
      NAV_CACHE.set(key, { result: redisHit, expires: Date.now() + NAV_CACHE_TTL_MS });
      return redisHit;
    }
  }
  const result = await buildNavigation(locale, role);
  NAV_CACHE.set(key, { result, expires: Date.now() + NAV_CACHE_TTL_MS });
  await writeRedisEntry(redis, key, result);
  return result;
}

export async function invalidateNavigationTree(locale?: string) {
  const redis = getRedisClient();
  const version = await getCacheVersion(redis);
  if (locale) {
    const key = getCacheKey(locale, version);
    NAV_CACHE.delete(key);
    if (redis) await redis.del(key);
  } else {
    NAV_CACHE.clear();
    if (redis) await Promise.all(locales.map((loc) => redis.del(getCacheKey(loc, version))));
  }
  await bumpCacheVersion(redis);
}
