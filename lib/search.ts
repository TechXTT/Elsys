import { prisma } from "./prisma";
import type { Locale } from "@/i18n/config";

export type SearchType = "news" | "page";

export interface SearchResult {
  type: SearchType;
  title: string;
  href: string;
  snippet: string;
}

interface Row { id?: string; slug?: string; title: string; excerpt: string | null; bodyMarkdown: string | null; blocks: unknown }

// Block props that hold human-readable prose. We pull ONLY these — never href /
// src / size / name etc. — so snippets can't leak block JSON or PDF-metadata
// blobs ({"href":…,"size":"320 KB"}).
const PROSE_KEYS = new Set([
  "markdown", "text", "title", "heading", "subtitle", "content", "body",
  "caption", "quote", "description", "intro", "lead", "label",
]);

/** Walk a block tree (any depth) and collect strings under prose keys only. */
function extractBlockText(blocks: unknown): string {
  let root = blocks;
  if (typeof root === "string") { try { root = JSON.parse(root); } catch { return ""; } }
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (v == null) return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === "string") { if (PROSE_KEYS.has(k)) out.push(val); }
        else walk(val);
      }
    }
  };
  walk(root);
  return out.join(" ");
}

/** Light markdown → plain text (drop images/links/syntax). */
function stripMarkdown(s: string | null): string {
  return (s ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")    // links → label
    .replace(/[#>*_`~|]/g, " ")                  // syntax
    .replace(/\s+/g, " ")
    .trim();
}

/** Build a plain-prose snippet, windowed around the first query term. */
function buildSnippet(query: string, row: Row): string {
  const clean = [row.excerpt, stripMarkdown(row.bodyMarkdown), stripMarkdown(extractBlockText(row.blocks))]
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join("  ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";

  const lc = clean.toLowerCase();
  let idx = -1;
  for (const term of query.toLowerCase().split(/\s+/).filter((t) => t.length > 1)) {
    const i = lc.indexOf(term);
    if (i >= 0 && (idx < 0 || i < idx)) idx = i;
  }
  // The search page already wraps the snippet as “…{snippet}…”, so return the
  // windowed slice without its own ellipses (trim a dangling partial word).
  const start = idx > 40 ? idx - 40 : 0;
  let snip = clean.slice(start, start + 220);
  if (start + 220 < clean.length) snip = snip.replace(/\s+\S*$/, "");
  return snip.trim();
}

/**
 * On-the-fly Postgres full-text search across published news posts + pages.
 * Matching uses to_tsvector/websearch_to_tsquery ('simple' config — works for
 * Cyrillic). Page block content (JSON) stays in the MATCH tsvector so result
 * counts are unchanged, but the displayed snippet is built in JS from extracted
 * prose (no JSON / PDF-metadata in excerpts).
 *
 * PERF TODO: computes tsvectors per query. Upgrade = stored tsvector + GIN index
 * (schema change — deferred).
 */
export async function searchContent(locale: Locale, q: string): Promise<SearchResult[]> {
  const query = q.trim();
  if (!query) return [];

  const [news, pages] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT id, title, excerpt, "bodyMarkdown", blocks
      FROM "NewsPost"
      WHERE locale = ${locale} AND status::text = 'PUBLISHED' AND date <= now()
        AND to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce("bodyMarkdown",''))
            @@ websearch_to_tsquery('simple', ${query})
      ORDER BY date DESC
      LIMIT 20`,
    prisma.$queryRaw<Row[]>`
      SELECT slug, title, excerpt, "bodyMarkdown", blocks
      FROM "Page"
      WHERE locale = ${locale} AND status::text = 'PUBLISHED' AND kind::text <> 'ROUTE'
        AND to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce("bodyMarkdown",'') || ' ' || coalesce(blocks::text,''))
            @@ websearch_to_tsquery('simple', ${query})
      LIMIT 20`,
  ]);

  return [
    ...news.map((r) => ({ type: "news" as const, title: r.title, href: `/novini/${r.id}`, snippet: buildSnippet(query, r) })),
    ...pages.map((r) => ({ type: "page" as const, title: r.title, href: `/${r.slug}`, snippet: buildSnippet(query, r) })),
  ];
}
