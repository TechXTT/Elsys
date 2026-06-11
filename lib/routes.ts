import { prisma } from "@/lib/prisma";
import { getCached } from "@/lib/cache";
import type { Locale } from "@/i18n/config";

/**
 * Route-alias resolution (formerly the /api/route-alias endpoint that
 * middleware self-fetched on every request).
 *
 * A `kind=ROUTE` Page row defines an alias: its `routeOverride` is the short
 * URL segment, its `routePath` is the target route template (which may contain
 * `[slug]` / `[...slug]` placeholders), and its `slug` is the own/default fill.
 *
 * The alias set per locale is cached through lib/cache.ts under the `routes`
 * namespace; admin mutations that touch Page.kind/routePath/routeOverride/slug
 * bump that version. Memory 60s → Redis 300s, same as the nav cache.
 */

type RouteAliasRow = {
  routeOverride: string | null;
  routePath: string | null;
  slug: string | null;
};

const ALIAS_TTL_MS = 60_000;

function sanitizeSegment(s?: string | null): string {
  return (s || "").trim().replace(/^\/+|\/+$/g, "");
}

function normalizeRouteBasePath(p: string): string {
  return sanitizeSegment(p).replace(/^(app|pages)\//, "");
}

async function getRouteAliasRows(locale: Locale): Promise<RouteAliasRow[]> {
  return getCached<RouteAliasRow[]>(`routes:aliases:${locale}`, {
    ttlMs: ALIAS_TTL_MS,
    loader: () =>
      (prisma as { page: { findMany: (args: unknown) => Promise<RouteAliasRow[]> } }).page.findMany({
        where: { locale, kind: "ROUTE", routeOverride: { not: null } },
        select: { routeOverride: true, routePath: true, slug: true },
      }),
  });
}

/**
 * Resolve an aliased URL path to the target route's slug parts, or `null` when
 * no alias matches. Mirrors the patterns the old /api/route-alias supported:
 * the first path segment is the alias; the rest is the "remainder".
 *   - routePath with `[...x]`  → fill with the whole remainder (else own slug)
 *   - routePath with `[x]`     → fill with the first remainder seg (else own
 *                                slug); any tail beyond the first is appended
 *   - static routePath         → append the remainder (else own slug)
 * `routePath` is normalized by stripping a leading `app/` or `pages/`.
 */
export async function resolveAlias(
  locale: Locale,
  slugParts: string[]
): Promise<string[] | null> {
  if (!slugParts.length) return null;

  const aliasSeg = sanitizeSegment(slugParts[0]);
  const remainderSegs = slugParts.slice(1);

  const rows = await getRouteAliasRows(locale);
  // routeOverride may be stored as "seg" or "/seg"; sanitizing both sides matches either.
  const alias = rows.find((r) => sanitizeSegment(r.routeOverride) === aliasSeg);
  if (!alias || !alias.routePath) return null;

  const own = sanitizeSegment(alias.slug || "");
  let base = normalizeRouteBasePath(alias.routePath);

  const hasCatchAll = /\[\.\.\.[^\]]+\]/.test(base);
  const hasSingle = /\[[^\]]+\]/.test(base);
  const remainder = sanitizeSegment(remainderSegs.join("/"));

  if (hasCatchAll) {
    const fill = remainder || own || "";
    base = base.replace(/\[\.\.\.[^\]]+\]/g, fill);
  } else if (hasSingle) {
    const first = sanitizeSegment(remainderSegs[0] || own || "");
    base = base.replace(/\[[^\]]+\]/g, first);
    if (remainderSegs.length > 1) {
      base = [base, remainderSegs.slice(1).join("/")].filter(Boolean).join("/");
    }
  } else {
    if (remainder) base = [base, remainder].filter(Boolean).join("/");
    else if (own) base = [base, own].filter(Boolean).join("/");
  }

  const target = sanitizeSegment(base);
  // No-op if the alias resolves to the path we already tried.
  if (!target || target === sanitizeSegment(slugParts.join("/"))) return null;
  return target.split("/").filter(Boolean);
}
