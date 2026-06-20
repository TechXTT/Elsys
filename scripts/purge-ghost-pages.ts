/* eslint-disable no-console */
// DEV-DB purge of the "ghost" duplicate roots: `${root}-bg` / `${root}-en` pages
// (locale-suffixed slugs with swapped labels) plus the empty crawl-junk orphans,
// in BOTH locales. Targets by EXACT slug+locale (id-independent, so it works even
// after the ghosts are re-created with new ids), captures-first to scripts/.cache/,
// deletes in a transaction, then RE-QUERIES in the same connection and asserts 0
// remain (rolls back / exits non-zero otherwise). Finally bumps the nav caches —
// the other maintenance scripts don't, which can leave the admin API stale.
//   pnpm purge:ghosts
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const CACHE = path.join(process.cwd(), "scripts/.cache");

const GHOST_ROOTS = ["novini", "priem", "obuchenie", "uchilishteto", "uchenicheski-zhivot", "blog", "evroproekti"];
// `${root}-bg` and `${root}-en` ghost slugs + the two empty crawl-junk slugs.
const TARGET_SLUGS = [
  ...GHOST_ROOTS.flatMap((r) => [`${r}-bg`, `${r}-en`]),
  "galleries/xhr",
  "novini-i-sybitija/novini",
];

async function flushNavCache() {
  const url = process.env.REDIS_URL;
  if (!url) { console.log("   (no REDIS_URL — skipping cache flush)"); return; }
  const { default: Redis } = await import("ioredis");
  const r = new Redis(url);
  let n = 0;
  for (const pat of ["nav-tree:*", "cache:*"]) {
    const ks = await r.keys(pat);
    if (ks.length) { await r.del(...ks); n += ks.length; }
  }
  await r.quit();
  console.log(`   flushed ${n} nav/content cache keys`);
}

async function main() {
  const prisma = new PrismaClient();

  // 1) Capture-first: dump full records (by exact slug, both locales).
  const rows = await prisma.page.findMany({ where: { slug: { in: TARGET_SLUGS } } });
  console.log(`Matched ${rows.length} ghost/junk rows by exact slug (both locales).`);
  for (const r of rows) console.log(`  ${r.id} ${r.locale}/${r.slug} title=${JSON.stringify(r.title)}`);
  if (rows.length === 0) { console.log("Nothing to purge."); await flushNavCache(); await prisma.$disconnect(); return; }

  // Safety: every matched row must be a locale-suffixed ghost or a known junk slug.
  const junk = new Set(["galleries/xhr", "novini-i-sybitija/novini"]);
  const wrong = rows.filter((r) => !junk.has(r.slug) && !/-(bg|en)$/.test(r.slug));
  if (wrong.length) {
    console.error("✋ Abort: matched a row that isn't a ghost/junk shape:", wrong.map((r) => r.slug).join(", "));
    await prisma.$disconnect();
    process.exit(3);
  }

  await mkdir(CACHE, { recursive: true });
  const dump = path.join(CACHE, `ghost-pages-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(dump, JSON.stringify(rows, null, 2));
  console.log(`Recoverable dump → ${dump}`);

  const ids = rows.map((r) => r.id);

  // 2) Delete in a transaction (handle the Page↔PageVersion circular FK).
  const deleted = await prisma.$transaction(async (tx) => {
    await tx.page.updateMany({ where: { id: { in: ids } }, data: { currentVersionId: null } });
    const v = await tx.pageVersion.deleteMany({ where: { pageId: { in: ids } } });
    const p = await tx.page.deleteMany({ where: { id: { in: ids } } });
    if (p.count !== ids.length) throw new Error(`Deleted ${p.count}, expected ${ids.length} — rolling back.`);
    return { pages: p.count, versions: v.count };
  });
  console.log(`✓ Deleted ${deleted.pages} pages (+${deleted.versions} versions).`);

  // 3) READ-BACK assertion in the same connection.
  const remaining = await prisma.page.findMany({ where: { slug: { in: TARGET_SLUGS } }, select: { slug: true, locale: true } });
  if (remaining.length !== 0) {
    console.error(`✋ Read-back FAILED: ${remaining.length} target rows still present:`, remaining.map((r) => `${r.locale}/${r.slug}`).join(", "));
    await prisma.$disconnect();
    process.exit(4);
  }
  console.log("✓ Read-back: 0 ghost/junk rows remain in Postgres.");

  // 4) Bump nav caches so the admin/public nav reflects the deletion.
  console.log("Flushing nav caches…");
  await flushNavCache();

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
