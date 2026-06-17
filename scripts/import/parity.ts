/* eslint-disable no-console */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";
import { fetchPage } from "./lib/http";
import { slugify } from "../../lib/slug";
import type { LegacyUrl } from "./crawl";

// Migration content-parity check (M4.4). Independently re-parses the CACHED
// legacy HTML (NOT the import pipeline, so it catches content the importer
// dropped) and asserts the key headings + a representative paragraph survived
// into the imported DB row, and that link counts are comparable. Cache-only —
// never re-hits the live site. Imported content is DRAFT (not public), so we
// compare against the stored body the page renders from.

const URLS_JSON = path.join(process.cwd(), "scripts/import/.cache/urls.json");
const REPORT = path.join(process.cwd(), "scripts/import/.cache/parity-report.json");

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[«»„“”"]/g, "").trim();

interface Row { type: string; legacyUrl: string; status: "ok" | "missing-row" | "gaps"; checks: { headingsTotal: number; headingsMissing: string[]; paragraphFound: boolean; legacyLinks: number; importedLinks: number; linkDelta: number } | null }

async function main() {
  if (!existsSync(URLS_JSON)) { console.error("No crawl inventory. Run pnpm import:crawl."); process.exit(1); }
  const urls: LegacyUrl[] = JSON.parse(await readFile(URLS_JSON, "utf8"));
  const prisma = new PrismaClient();
  const rows: Row[] = [];

  for (const u of urls) {
    if (u.legacyId == null) continue; // only content items carry provenance
    const isNews = u.type === "news" || u.type === "blog";
    const page = await fetchPage(u.url, { cacheOnly: true });
    if (!page) { rows.push({ type: u.type, legacyUrl: u.url, status: "missing-row", checks: null }); continue; }

    // Independent legacy extraction from the content container.
    const $ = cheerio.load(page.html);
    const container = $(".single-text .text").first().length ? $(".single-text .text").first() : $(".single-text").first();
    container.find(".page-title").remove();
    const headings = container.find("h1,h2,h3,h4").toArray().map((e) => $(e).text().trim()).filter((t) => t.length > 2);
    const paragraphs = container.find("p").toArray().map((e) => $(e).text().trim()).filter(Boolean).sort((a, b) => b.length - a.length);
    const longestPara = paragraphs[0] ?? "";
    const legacyLinks = container.find('a[href]').toArray().filter((e) => {
      const h = $(e).attr("href") || ""; return h && !h.startsWith("#") && !h.startsWith("mailto:");
    }).length;

    // Imported DB row by legacyId.
    const imported = isNews
      ? await prisma.newsPost.findFirst({ where: { legacyId: u.legacyId }, select: { title: true, bodyMarkdown: true } })
      : await prisma.page.findFirst({ where: { legacyId: u.legacyId }, select: { title: true, bodyMarkdown: true } });
    if (!imported) { rows.push({ type: u.type, legacyUrl: u.url, status: "missing-row", checks: null }); continue; }

    const md = norm(imported.bodyMarkdown ?? "");
    const headingsMissing = headings.filter((h) => !md.includes(norm(h)));
    const paragraphFound = longestPara.length < 12 || md.includes(norm(longestPara).slice(0, 60));
    // Markdown links excluding image embeds (![alt](url) also contains "](").
    const importedLinks = (imported.bodyMarkdown?.match(/(?<!!)\]\(/g) ?? []).length;
    const linkDelta = Math.abs(legacyLinks - importedLinks);

    const gaps = headingsMissing.length > 0 || !paragraphFound || linkDelta > 2;
    rows.push({
      type: u.type, legacyUrl: u.url, status: gaps ? "gaps" : "ok",
      checks: { headingsTotal: headings.length, headingsMissing, paragraphFound, legacyLinks, importedLinks, linkDelta },
    });
    void slugify; // (kept available for future slug cross-checks)
  }

  await prisma.$disconnect();

  const byStatus = rows.reduce<Record<string, number>>((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
  const gaps = rows.filter((r) => r.status !== "ok");
  await writeFile(REPORT, JSON.stringify({ generatedAt: new Date().toISOString(), total: rows.length, byStatus, rows }, null, 2));

  console.log("\n=== Migration content-parity report ===");
  console.log("Checked:", rows.length, "| by status:", byStatus);
  console.log("\nPer type:");
  for (const t of [...new Set(rows.map((r) => r.type))]) {
    const tr = rows.filter((r) => r.type === t);
    console.log(`  ${t}: ${tr.filter((r) => r.status === "ok").length}/${tr.length} ok`);
  }
  if (gaps.length) {
    console.log("\nGaps / missing (review):");
    for (const g of gaps.slice(0, 25)) {
      console.log(`  [${g.status}] ${g.type} ${g.legacyUrl}` + (g.checks ? ` — missingHeadings=${g.checks.headingsMissing.length}, paragraphFound=${g.checks.paragraphFound}, links ${g.checks.legacyLinks}→${g.checks.importedLinks}` : ""));
    }
  } else {
    console.log("\nNo content-parity gaps. ✅");
  }
  console.log(`\nFull report → ${REPORT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
