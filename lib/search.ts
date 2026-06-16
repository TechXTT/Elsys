import { prisma } from "./prisma";
import type { Locale } from "@/i18n/config";

export type SearchType = "news" | "page";

export interface SearchResult {
  type: SearchType;
  title: string;
  href: string;
  snippet: string;
}

interface NewsRow { id: string; title: string; snippet: string | null }
interface PageRow { slug: string; title: string; snippet: string | null }

/**
 * On-the-fly Postgres full-text search across published news posts + pages.
 * Uses to_tsvector/websearch_to_tsquery with the 'simple' config (no stemming —
 * works for Cyrillic) and ts_headline for a plain snippet. Page block content
 * (JSON) is searched by casting blocks::text.
 *
 * PERF TODO: this computes tsvectors per query. The upgrade is a stored
 * `tsvector` column + GIN index on NewsPost/Page (a schema change — deferred).
 */
export async function searchContent(locale: Locale, q: string): Promise<SearchResult[]> {
  const query = q.trim();
  if (!query) return [];

  // Default StartSel/StopSel (<b>…</b>) markers are stripped in clip() — empty
  // values confuse ts_headline's comma-separated option parser.
  const headlineOpts = "MaxWords=26,MinWords=8,MaxFragments=1,ShortWord=2";

  const [news, pages] = await Promise.all([
    prisma.$queryRaw<NewsRow[]>`
      SELECT id, title,
        ts_headline('simple', coalesce(excerpt,'') || ' ' || coalesce("bodyMarkdown",''),
          websearch_to_tsquery('simple', ${query}), ${headlineOpts}) AS snippet
      FROM "NewsPost"
      WHERE locale = ${locale} AND status::text = 'PUBLISHED' AND date <= now()
        AND to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce("bodyMarkdown",''))
            @@ websearch_to_tsquery('simple', ${query})
      ORDER BY date DESC
      LIMIT 20`,
    prisma.$queryRaw<PageRow[]>`
      SELECT slug, title,
        ts_headline('simple', coalesce(excerpt,'') || ' ' || coalesce("bodyMarkdown",'') || ' ' || coalesce(blocks::text,''),
          websearch_to_tsquery('simple', ${query}), ${headlineOpts}) AS snippet
      FROM "Page"
      WHERE locale = ${locale} AND status::text = 'PUBLISHED' AND kind::text <> 'ROUTE'
        AND to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce("bodyMarkdown",'') || ' ' || coalesce(blocks::text,''))
            @@ websearch_to_tsquery('simple', ${query})
      LIMIT 20`,
  ]);

  // Strip ts_headline's <b> match markers + collapse whitespace.
  const clip = (s: string | null) => (s ?? "").replace(/<\/?b>/g, "").trim().replace(/\s+/g, " ").slice(0, 220);

  const results: SearchResult[] = [
    ...news.map((r) => ({ type: "news" as const, title: r.title, href: `/novini/${r.id}`, snippet: clip(r.snippet) })),
    ...pages.map((r) => ({ type: "page" as const, title: r.title, href: `/${r.slug}`, snippet: clip(r.snippet) })),
  ];
  return results;
}
