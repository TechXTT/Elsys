/* eslint-disable no-console */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { fetchPage } from "./lib/http";
import { extract, type Extracted } from "./extract";
import { upsertNews, upsertPage, persistRedirect, linkPageParents, normalizeOrphanSlugs, pruneJunkOrphans } from "./importer";
import { getNewsDatesFromIndex } from "./news-dates";
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
  committed: { news: number; pages: number; mediaImported: number; redirects: number; parentsLinked: number };
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

  if (!existsSync(URLS_JSON)) {
    console.error(`No crawl inventory at ${URLS_JSON}. Run: pnpm import:crawl`);
    process.exit(1);
  }

  // DEV-DB safety: refuse --commit against an obviously production database.
  const dbUrl = process.env.PRISMA_DATABASE_URL ?? "";
  if (commit && /(\bprod\b|production)/i.test(dbUrl)) {
    console.error("✋ Refusing --commit: PRISMA_DATABASE_URL looks like production. DEV DB only.");
    process.exit(2);
  }

  const prisma = commit ? new PrismaClient() : null;
  let userId: string | null = null;
  // Load best-effort news dates from the index for both dry-run reporting + commit.
  const dateMap = await getNewsDatesFromIndex({ cacheOnly: true });
  if (commit && prisma) {
    userId = (await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } }))?.id ?? null;
    console.log(`Commit mode: importing as DRAFT (author ${userId ?? "none"}), ${dateMap.size} index dates.`);
  }

  let urls: LegacyUrl[] = JSON.parse(await readFile(URLS_JSON, "utf8"));
  if (only) urls = urls.filter((u) => u.type === only);
  if (limit) urls = urls.slice(0, limit);

  const report: Report = {
    generatedAt: new Date().toISOString(),
    dryRun: !commit,
    totals: { urls: urls.length, extracted: 0, unmapped: 0 },
    countsByType: {},
    news: { count: 0, missingDate: [] },
    pages: { count: 0 },
    media: { referenced: 0, missingAlt: 0, consentReviewRequired: 0 },
    htmlWarnings: {},
    redirects: { coveragePct: 0, mapped: 0, unmapped: [], sample: [] },
    unmappedUrls: [],
    committed: { news: 0, pages: 0, mediaImported: 0, redirects: 0, parentsLinked: 0 },
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

    const newsMissingDate = e.kind === "news" && e.legacyId != null && !dateMap.has(e.legacyId);
    if (e.kind === "news") {
      report.news.count++;
      if (newsMissingDate) report.news.missingDate.push(u.pathname);
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

    // Commit: upsert the record (DRAFT) + backfill its legacy→new redirect.
    if (commit && prisma) {
      const res = e.kind === "news"
        ? await upsertNews(prisma, e, dateMap, userId, { dryRun: false })
        : await upsertPage(prisma, e, userId, { dryRun: false });
      report.committed.mediaImported += res.mediaImported;
      if (e.kind === "news") report.committed.news++; else report.committed.pages++;
      await persistRedirect(prisma, u.url, to, e.legacyId ?? null, { dryRun: false });
      report.committed.redirects++;
    }
  }

  // Dropped-type legacy URLs (Calendar/Internships/Prep) → sensible targets (§2).
  if (commit && prisma) {
    const dropped: { from: string; to: string }[] = [
      { from: "/obuchenie/kalendar-na-sybitijata", to: "/novini" },
    ];
    for (const d of dropped) {
      await persistRedirect(prisma, d.from, d.to, null, { dryRun: false });
      report.committed.redirects++;
    }

    // Post-passes (idempotent): normalize aliased root slugs onto canonical
    // sections, prune empty crawl-junk orphans, then link Page.parentId from the
    // hierarchical slug so the admin nav tree nests.
    const norm = await normalizeOrphanSlugs(prisma);
    const prune = await pruneJunkOrphans(prisma);
    const linked = await linkPageParents(prisma);
    report.committed.parentsLinked = linked.linked;
    console.log(`Slug normalize: renamed ${norm.renamed} (+${norm.redirects} redirects); pruned ${prune.deleted.length} junk; linked ${linked.linked} parents (orphans: ${linked.orphans.length}).`);
  }

  const totalRedirectCandidates = report.redirects.mapped + report.redirects.unmapped.length;
  report.redirects.coveragePct = totalRedirectCandidates
    ? Math.round((report.redirects.mapped / totalRedirectCandidates) * 100)
    : 0;

  await writeFile(REPORT_JSON, JSON.stringify(report, null, 2));

  // Console summary.
  console.log(`\n=== Migration ${commit ? "COMMIT" : "dry-run"} report ===`);
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
  if (commit) {
    console.log("Committed (DRAFT):", report.committed);
  } else {
    console.log("Imported content would land as DRAFT (never auto-published). Re-run with --commit to write to the DEV DB.");
  }
  console.log(`\nFull report → ${REPORT_JSON}`);
  if (prisma) await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
