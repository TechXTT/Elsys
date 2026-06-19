// Single source of truth for normalizing imported root slug segments onto the
// EXISTING seeded canonical sections, so imported children nest under them
// instead of forming duplicate roots. Each target MUST exist as a seeded Page
// (verified via slug_locale before adding here) — we never create a new root.
//
// Verified 2026-06-17: uchenicheski-zhivot ✓ (bg+en PAGE), dokumenti ✓ (bg+en PAGE).
// `galleries` was intentionally NOT aliased — no `galerii` Page exists (the
// gallery is a /galeria route), and the lone `galleries/xhr` orphan is empty
// crawl junk (purged, not nested). `novini-i-sybitija` likewise not aliased
// (`novini` is a route, not a parent) — its lone empty orphan is purged.
export const ROOT_SLUG_ALIASES: Record<string, string> = {
  "uchenicheski-jivot": "uchenicheski-zhivot",
  documents: "dokumenti",
};

// Empty crawl-junk orphans to prune (verified 0-length body, DRAFT). Pruned by
// exact slug_locale → id (capture-first), never by pattern.
export const JUNK_ORPHAN_SLUGS = ["galleries/xhr", "novini-i-sybitija/novini"] as const;

// Rewrite the first path segment of a slug via the alias map (idempotent).
export function normalizeSlug(slug: string): string {
  const i = slug.indexOf("/");
  if (i < 0) return ROOT_SLUG_ALIASES[slug] ?? slug;
  const head = slug.slice(0, i);
  return (ROOT_SLUG_ALIASES[head] ?? head) + slug.slice(i);
}
