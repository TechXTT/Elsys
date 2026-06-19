/* eslint-disable no-console */
// Purge Playwright e2e artifacts that accumulate in the shared dev DB and crowd
// the public homepage. Matches ONLY the distinctive e2e markers, each carrying a
// 13-digit unix-ms timestamp, and ABORTS if any matched row doesn't fit that
// shape (i.e. looks like real content). The seeded scheduled fixture
// "Насрочена новина (M0.4)" (2099) is intentionally NOT matched — it's real seed
// data. Capture-first, read-back assert, no full wipe.  pnpm purge:test-pollution
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const CACHE = path.join(process.cwd(), "scripts/.cache");
const TS = /\b\d{13}$/; // trailing unix-ms — the e2e uniqueness marker

async function main() {
  const prisma = new PrismaClient();

  const carousel = await prisma.carousel.findMany({ where: { title: { startsWith: "Test Slide E2E " } }, select: { id: true, title: true } });
  const clubs = await prisma.club.findMany({ where: { title: { startsWith: "Test Club E2E " } }, select: { id: true, title: true } });
  const news = await prisma.newsPost.findMany({ where: { title: { startsWith: "Опростена новина " } }, select: { id: true, title: true, locale: true } });

  console.log("Matched e2e artifacts:");
  console.log("  Carousel 'Test Slide E2E':", carousel.length, carousel.map((r) => r.title));
  console.log("  Club 'Test Club E2E':", clubs.length, clubs.map((r) => r.title));
  console.log("  NewsPost 'Опростена новина':", news.length, news.map((r) => r.title));

  // Guard: every matched title MUST carry a 13-digit timestamp (pure e2e shape).
  const suspicious = [...carousel, ...clubs, ...news].filter((r) => !TS.test(r.title));
  if (suspicious.length) {
    console.error("✋ Abort: matched a row without an e2e timestamp (looks real):", suspicious.map((r) => r.title).join(" | "));
    await prisma.$disconnect(); process.exit(2);
  }
  if (!carousel.length && !clubs.length && !news.length) { console.log("Nothing to purge."); await prisma.$disconnect(); return; }

  await mkdir(CACHE, { recursive: true });
  const dump = path.join(CACHE, `test-pollution-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(dump, JSON.stringify({ carousel, clubs, news }, null, 2));
  console.log(`Capture → ${dump}`);

  const newsIds = news.map((r) => r.id);
  const counts = await prisma.$transaction(async (tx) => {
    if (newsIds.length) await tx.newsPostVersion.deleteMany({ where: { newsPostId: { in: newsIds } } });
    const c = await tx.carousel.deleteMany({ where: { id: { in: carousel.map((r) => r.id) } } });
    const cl = await tx.club.deleteMany({ where: { id: { in: clubs.map((r) => r.id) } } });
    const n = await tx.newsPost.deleteMany({ where: { id: { in: newsIds } } });
    const expected = carousel.length + clubs.length + news.length;
    if (c.count + cl.count + n.count !== expected) throw new Error(`Deleted ${c.count + cl.count + n.count}, expected ${expected} — rolling back.`);
    return { carousel: c.count, clubs: cl.count, news: n.count };
  });
  console.log(`✓ Deleted carousel=${counts.carousel}, clubs=${counts.clubs}, news=${counts.news}.`);

  // Read-back.
  const left = (await prisma.carousel.count({ where: { title: { startsWith: "Test Slide E2E " } } }))
    + (await prisma.club.count({ where: { title: { startsWith: "Test Club E2E " } } }))
    + (await prisma.newsPost.count({ where: { title: { startsWith: "Опростена новина " } } }));
  if (left !== 0) { console.error(`✋ Read-back FAILED: ${left} marker rows remain.`); await prisma.$disconnect(); process.exit(4); }
  console.log("✓ Read-back: 0 e2e-marker rows remain. (Seed fixture 'Насрочена новина (M0.4)' left intact.)");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
