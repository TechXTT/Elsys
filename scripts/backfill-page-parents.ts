/* eslint-disable no-console */
// One-off maintenance backfill (run via tsx): normalize imported root slugs onto
// the seeded canonical sections, prune empty crawl-junk orphans, then link
// Page.parentId from the hierarchical slug so the admin nav tree nests — all
// without a re-import. Idempotent. Reuses the importer functions (single source
// of truth).  pnpm import:link-parents
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { normalizeOrphanSlugs, pruneJunkOrphans, linkPageParents } from "./import/importer";
import { JUNK_ORPHAN_SLUGS } from "./import/root-aliases";

const IMPORT_LOCALE = "bg";
const CACHE = path.join(process.cwd(), "scripts/.cache");

async function main() {
  const prisma = new PrismaClient();

  console.log("1/4 Normalizing imported root slugs onto canonical sections…");
  const norm = await normalizeOrphanSlugs(prisma, { log: (m) => console.log(m) });
  console.log(`   renamed=${norm.renamed}, redirects=${norm.redirects}, skipped=${norm.skipped.length}`);

  // Capture-first: dump the full junk-orphan rows BEFORE pruning (recoverable).
  console.log("2/4 Capturing junk-orphan rows before prune…");
  const junkRows = await prisma.page.findMany({
    where: { locale: IMPORT_LOCALE, slug: { in: [...JUNK_ORPHAN_SLUGS] } },
  });
  if (junkRows.length) {
    await mkdir(CACHE, { recursive: true });
    const dump = path.join(CACHE, `pruned-junk-orphans-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    await writeFile(dump, JSON.stringify(junkRows, null, 2));
    console.log(`   dumped ${junkRows.length} row(s) → ${dump}`);
    console.log("   ids:", junkRows.map((r) => `${r.id} (${r.slug})`).join(", "));
  } else {
    console.log("   no junk-orphan rows present (already pruned).");
  }

  console.log("3/4 Pruning empty junk orphans (exact id, DRAFT + empty only)…");
  const prune = await pruneJunkOrphans(prisma, { log: (m) => console.log(m) });
  console.log(`   deleted=${prune.deleted.length}, kept=${prune.kept.length}`);
  if (prune.kept.length) console.log("   kept (not empty/draft):", JSON.stringify(prune.kept));

  console.log("4/4 Linking Page.parentId from hierarchical slugs…");
  const linked = await linkPageParents(prisma, { log: (m) => console.log(m) });
  console.log(`   linked=${linked.linked}, alreadyLinked=${linked.alreadyLinked}, orphans=${linked.orphans.length}`);
  if (linked.orphans.length) console.log("   residual orphans:", linked.orphans.join(", "));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
