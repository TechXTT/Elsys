// scripts/drop-static-pages-from-json.ts
// Run with: pnpm pages:drop-json [--dry-run] [--locale=bg]
// Reads static-page-blocks.json and deletes matching pages (and optionally orphan folders) before reseeding.
// Safeguards: skips FOLDER pages unless they become empty; supports --dry-run to preview.

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const INPUT_FILE = path.join(process.cwd(), "static-page-blocks.json");

interface PageBlocks { slug: string; url: string; blocks?: any[] }

function parseArgs() {
  const args = process.argv.slice(2);
  let locale = "bg";
  let dryRun = false;
  for (const a of args) {
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--locale=")) locale = a.split("=")[1] || locale;
  }
  return { locale, dryRun };
}

async function dropPages(locale: string, dryRun: boolean) {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Missing ${INPUT_FILE}. Run scraper first.`);
    process.exit(1);
  }
  const raw: PageBlocks[] = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const slugs = raw.map(r => (r.slug === "" ? "home" : r.slug));
  const folders = new Set<string>();
  const targets: { full: string; leaf: string; segments: string[] }[] = [];

  for (const full of slugs) {
    const segments = full.split("/").filter(Boolean);
    const leaf = segments.length ? segments[segments.length - 1] : full;
    if (segments.length > 1) folders.add(segments[0]);
    targets.push({ full, leaf, segments });
  }

  console.log(`Will process ${targets.length} page slugs (locale=${locale})`);
  if (dryRun) console.log("Dry-run mode: no deletions will be performed.\n");

  for (const t of targets) {
    // Delete exact full-path legacy page if it exists (before migrating to leaf hierarchy)
    if (t.full !== t.leaf) {
      const legacy = await prisma.page.findUnique({ where: { slug_locale: { slug: t.full, locale } }, select: { id: true, kind: true } });
      if (legacy) {
        console.log(`Legacy full-path match: ${t.full} -> ${legacy.id} (${legacy.kind}) ${dryRun ? '[skip]' : ''}`);
        if (!dryRun) await prisma.page.delete({ where: { id: legacy.id } });
      }
    }
    // Delete leaf page (PAGE kind only)
    const leafPage = await prisma.page.findUnique({ where: { slug_locale: { slug: t.leaf, locale } }, include: { children: { select: { id: true } } } });
    if (leafPage && leafPage.kind !== "FOLDER") {
      console.log(`Leaf match: ${t.leaf} -> ${leafPage.id} (${leafPage.kind}) ${dryRun ? '[skip]' : ''}`);
      if (!dryRun) await prisma.page.delete({ where: { id: leafPage.id } });
    }
  }

  // Attempt to remove empty folders created earlier if now orphaned
  for (const folderSlug of folders) {
    const folder = await prisma.page.findUnique({ where: { slug_locale: { slug: folderSlug, locale } }, include: { children: { select: { id: true } } } });
    if (folder && folder.kind === "FOLDER" && folder.children.length === 0) {
      console.log(`Orphan folder: ${folderSlug} -> ${folder.id} ${dryRun ? '[skip]' : ''}`);
      if (!dryRun) await prisma.page.delete({ where: { id: folder.id } });
    }
  }
  console.log("Done dropping.");
}

async function run() {
  const { locale, dryRun } = parseArgs();
  try {
    await dropPages(locale, dryRun);
  } catch (err) {
    console.error("Drop error:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
