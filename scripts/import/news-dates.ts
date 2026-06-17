import * as cheerio from "cheerio";
import { fetchPage } from "./lib/http";

// Best-effort news dates (G4): the news index lists each article with a <time>.
// Pairs the <time> to its card's /novini/ link → Map<legacyId, ISO date>.
// Articles without a recoverable date are left for the importer to flag.

const INDEX_URL = "https://elsys-bg.org/novini-i-sybitija/novini";

function parseDmy(text: string): string | null {
  const m = text.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function getNewsDatesFromIndex(opts: { cacheOnly?: boolean } = {}): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const page = await fetchPage(INDEX_URL, { cacheOnly: opts.cacheOnly });
  if (!page) return map;
  const $ = cheerio.load(page.html);
  $("time").each((_, t) => {
    const iso = parseDmy($(t).text());
    if (!iso) return;
    // Climb to the card ancestor that holds the article link.
    let cur = $(t).parent();
    for (let i = 0; i < 6 && cur.length; i++) {
      const link = cur.find('a[href*="/novini/"]').first();
      const href = link.attr("href");
      const idMatch = href?.match(/-(\d+)\/?$/);
      if (idMatch) { map.set(Number(idMatch[1]), iso); return; }
      cur = cur.parent();
    }
  });
  return map;
}
