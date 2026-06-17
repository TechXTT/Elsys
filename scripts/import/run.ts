/* eslint-disable no-console */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fetchPage } from "./lib/http";
import { extract, type Extracted } from "./extract";
import type { LegacyUrl } from "./crawl";

// Migration runner (G4 / M4). DEFAULT = --dry-run: reads the cached crawl
// inventory, extracts every page, and writes a full import report WITHOUT
// touching the DB or the network. The commit path (DB upserts as DRAFT, media
// download/Blob upload, RouteRedirect persistence) is gated behind --commit and
// intentionally NOT enabled in this build — see scripts/import/README.md +
// docs/patterns/migration.md. Run the dry-run and review the report first.

const CACHE = path.join(process.cwd(), "scripts/import/.cache");
const URLS_JSON = path.join(CACHE, "urls.json");
const REPORT_JSON = path.join(CACHE, "import-report.json");

interface Report {
  generatedAt: string;
  dryRun: boolean;
  totals: { urls: number; extracted: number; unmapped: number };
  countsByType: Record<string, number>;
  news: { count: number; missingDate: string[] };
  pages: { count: number };
  media: { referenced: number; missingAlt: number; consentReviewRequired: number };
  htmlWarnings: Record<string, number>;
  redirects: { coveragePct: number; mapped: number; unmapped: string[]; sample: { from: string; to: string }[] };
  unmappedUrls: string[];
}

function targetPath(e: Extracted): string {
  if (e.kind === "news") return `/novini/${e.slug}`;
  return e.parentSlug ? `/${e.parentSlug}/${e.slug}` : `/${e.slug}`;
}

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const only = args.find((a) => a.startsWith("--only="))?.split("=")[1];
  const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0) || undefined;

  if (commit) {
    console.error("✋ --commit is not enabled in this build (DEV-DB write path + media/Blob + RouteRedirect are pending sub-phases).");
    console.error("   Review the --dry-run report first; see scripts/import/README.md.");
    process.exit(2);
  }

  if (!existsSync(URLS_JSON)) {
    console.error(`No crawl inventory at ${URLS_JSON}. Run: pnpm import:crawl`);
    process.exit(1);
  }

  let urls: LegacyUrl[] = JSON.parse(await readFile(URLS_JSON, "utf8"));
  if (only) urls = urls.filter((u) => u.type === only);
  if (limit) urls = urls.slice(0, limit);

  const report: Report = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    totals: { urls: urls.length, extracted: 0, unmapped: 0 },
    countsByType: {},
    news: { count: 0, missingDate: [] },
    pages: { count: 0 },
    media: { referenced: 0, missingAlt: 0, consentReviewRequired: 0 },
    htmlWarnings: {},
    redirects: { coveragePct: 0, mapped: 0, unmapped: [], sample: [] },
    unmappedUrls: [],
  };

  for (const u of urls) {
    report.countsByType[u.type] = (report.countsByType[u.type] ?? 0) + 1;
    const page = await fetchPage(u.url, { cacheOnly: true });
    if (!page) { report.unmappedUrls.push(u.url + " (not cached)"); report.redirects.unmapped.push(u.url); continue; }
    const e = extract(page.html, u);
    if (!e) { report.totals.unmapped++; report.unmappedUrls.push(u.url + " (no extractor)"); report.redirects.unmapped.push(u.url); continue; }

    report.totals.extracted++;
    const to = targetPath(e);
    report.redirects.mapped++;
    if (report.redirects.sample.length < 12) report.redirects.sample.push({ from: u.pathname, to });

    if (e.kind === "news") {
      report.news.count++;
      if (!e.date) report.news.missingDate.push(u.pathname);
    } else {
      report.pages.count++;
    }
    for (const img of e.images) {
      report.media.referenced++;
      if (!img.alt?.trim()) report.media.missingAlt++;
      // Consent is a legal judgment — never auto-asserted; every imported person
      // photo is flagged for human review. Heuristic flag: all imported images.
      report.media.consentReviewRequired++;
    }
    for (const w of e.warnings) report.htmlWarnings[w] = (report.htmlWarnings[w] ?? 0) + 1;
  }

  const totalRedirectCandidates = report.redirects.mapped + report.redirects.unmapped.length;
  report.redirects.coveragePct = totalRedirectCandidates
    ? Math.round((report.redirects.mapped / totalRedirectCandidates) * 100)
    : 0;

  await writeFile(REPORT_JSON, JSON.stringify(report, null, 2));

  // Console summary.
  console.log("\n=== Migration dry-run report ===");
  console.log("URLs in inventory:", report.totals.urls, "| extracted:", report.totals.extracted, "| unmapped:", report.totals.unmapped);
  console.log("By type:", report.countsByType);
  console.log("News:", report.news.count, "(missing date:", report.news.missingDate.length + ")");
  console.log("Pages:", report.pages.count);
  console.log("Media referenced:", report.media.referenced, "| missing alt:", report.media.missingAlt, "| consent-review:", report.media.consentReviewRequired);
  console.log("HTML conversion warnings:", report.htmlWarnings);
  console.log("Redirect coverage:", report.redirects.coveragePct + "%", `(${report.redirects.mapped} mapped, ${report.redirects.unmapped.length} unmapped)`);
  console.log("Sample redirects:");
  for (const r of report.redirects.sample) console.log(`  ${r.from}  →  ${r.to}`);
  if (report.unmappedUrls.length) console.log("Unmapped:", report.unmappedUrls.slice(0, 10));
  console.log(`\nFull report → ${REPORT_JSON}`);
  console.log("Imported content would land as DRAFT (never auto-published). --commit is disabled pending review.");
}

main().catch((e) => { console.error(e); process.exit(1); });
