/* eslint-disable no-console */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { ORIGIN, fetchPage, isAllowed, pLimit } from "./lib/http";

// Polite crawler (G4 / PLAN M4.2): enumerate every legacy content URL by BFS
// from the homepage + section roots. Read-only, throttled, cached. Writes a URL
// inventory (classified + legacyId) to scripts/import/.cache/urls.json.

export type LegacyType = "news" | "blog" | "page" | "item" | "other";

const SEEDS = [
  "/",
  "/novini-i-sybitija/novini",
  "/blog",
  "/obuchenie",
  "/priem",
  "/uchenicheski-jivot",
];

const ASSET_RE = /\.(css|js|png|jpe?g|gif|svg|webp|ico|pdf|docx?|xlsx?|pptx?|zip|mp4|woff2?)$/i;

export interface LegacyUrl {
  url: string;
  pathname: string;
  type: LegacyType;
  legacyId: number | null;
  slug: string | null;
}

/** Trailing `-<id>` marks a content item; capture id + slug. */
export function classify(pathname: string): LegacyUrl {
  const idMatch = pathname.match(/-(\d+)\/?$/);
  const legacyId = idMatch ? Number(idMatch[1]) : null;
  const slug = legacyId ? pathname.replace(/\/$/, "").split("/").pop()!.replace(/-\d+$/, "") : null;
  let type: LegacyType = "other";
  if (/^\/novini-i-sybitija\/novini\/.+-\d+\/?$/.test(pathname)) type = "news";
  else if (/^\/blog\/.+-\d+\/?$/.test(pathname)) type = "blog";
  else if (legacyId) type = "item";
  else if (/^\/(obuchenie|priem|uchenicheski-jivot)\/[^/]+\/?$/.test(pathname)) type = "page";
  else if (/^\/[^/]+\/?$/.test(pathname) && pathname !== "/") type = "page";
  return { url: ORIGIN + pathname, pathname, type, legacyId, slug };
}

function extractLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const out: string[] = [];
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const u = new URL(href, ORIGIN);
      if (u.origin !== ORIGIN) return;
      if (ASSET_RE.test(u.pathname)) return;
      if (!isAllowed(u.pathname)) return;
      out.push(u.pathname.replace(/\/$/, "") || "/");
    } catch { /* ignore */ }
  });
  return out;
}

export async function crawl(opts: { limit?: number; cacheOnly?: boolean } = {}): Promise<LegacyUrl[]> {
  const seen = new Set<string>();
  const queue: string[] = [...SEEDS];
  const found = new Map<string, LegacyUrl>();
  const limit = pLimit(1); // sequential — politeness over speed
  let fetched = 0;

  while (queue.length > 0) {
    if (opts.limit && fetched >= opts.limit) break;
    const pathname = queue.shift()!;
    if (seen.has(pathname)) continue;
    seen.add(pathname);

    const page = await limit(() => fetchPage(ORIGIN + pathname, { cacheOnly: opts.cacheOnly }));
    fetched++;
    if (!page) continue;

    const entry = classify(pathname);
    if (pathname !== "/") found.set(pathname, entry);

    for (const link of extractLinks(page.html)) {
      if (!seen.has(link)) {
        queue.push(link);
        const e = classify(link);
        if (e.type !== "other") found.set(link, e);
      }
    }
    if (fetched % 20 === 0) console.log(`  crawled ${fetched} pages, ${found.size} content URLs…`);
  }

  return Array.from(found.values());
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const cacheOnly = args.includes("--cache-only");
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  console.log(`Crawling ${ORIGIN}${cacheOnly ? " (cache-only)" : ""}${limit ? ` (limit ${limit})` : ""}…`);
  const urls = await crawl({ limit, cacheOnly });

  const byType: Record<string, number> = {};
  for (const u of urls) byType[u.type] = (byType[u.type] ?? 0) + 1;

  const outDir = path.join(process.cwd(), "scripts/import/.cache");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "urls.json"), JSON.stringify(urls, null, 2));
  console.log(`Done. ${urls.length} content URLs:`, byType);
  console.log(`Inventory → scripts/import/.cache/urls.json`);
}

if (process.argv[1] && process.argv[1].endsWith("crawl.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
