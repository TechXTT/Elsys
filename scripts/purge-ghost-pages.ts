/* eslint-disable no-console */
// One-off DEV-DB purge of the 14 ghost pages: a 2026-06-17T12:45:59 burst of
// `${slug}-bg` / `${slug}-en` duplicate roots with swapped labels (locale bg
// rows holding English titles and vice-versa). Capture-first to scripts/.cache/,
// then delete by EXACT id in a transaction with an == 14 assertion. Never uses a
// LIKE/pattern delete.  pnpm purge:ghosts
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const CACHE = path.join(process.cwd(), "scripts/.cache");

// The exact 14 ids identified (7 roots × 2 locales).
const GHOST_IDS = [
  "cmqi2e3v50049g5f5q3jve0b9", // bg/novini-bg
  "cmqi2e3wt004bg5f5dhvxwkhn", // en/novini-en
  "cmqi2e403004dg5f5zwnp1yie", // bg/priem-bg
  "cmqi2e41z004fg5f5s6gl623j", // en/priem-en
  "cmqi2e43a004hg5f56hqz3i34", // en/obuchenie-en
  "cmqi2e44g004jg5f5iu56cx6d", // bg/obuchenie-bg
  "cmqi2e45q004lg5f5z6bjgsl3", // en/uchilishteto-en
  "cmqi2e478004ng5f52afwh0er", // bg/uchilishteto-bg
  "cmqi2e48n004pg5f5qnt6wtjp", // en/uchenicheski-zhivot-en
  "cmqi2e49w004rg5f5z6zbxodh", // bg/uchenicheski-zhivot-bg
  "cmqi2e4bk004tg5f5zbe5zarh", // bg/blog-bg
  "cmqi2e4ek004vg5f5o0ksllq0", // en/blog-en
  "cmqi2e4fu004xg5f5autlly2v", // en/evroproekti-en
  "cmqi2e4h8004zg5f5h4iocdvu", // bg/evroproekti-bg
];

async function main() {
  const prisma = new PrismaClient();

  // 1) Capture-first: dump full records.
  const rows = await prisma.page.findMany({ where: { id: { in: GHOST_IDS } } });
  console.log(`Found ${rows.length} of ${GHOST_IDS.length} target rows.`);
  for (const r of rows) console.log(`  ${r.id} ${r.locale}/${r.slug} title=${JSON.stringify(r.title)}`);

  // 2) Safety asserts BEFORE any delete.
  if (rows.length !== GHOST_IDS.length) {
    console.error(`✋ Abort: expected ${GHOST_IDS.length} rows, found ${rows.length}. No deletion performed.`);
    const missing = GHOST_IDS.filter((id) => !rows.some((r) => r.id === id));
    console.error("Missing ids:", missing.join(", "));
    await prisma.$disconnect();
    process.exit(2);
  }
  const wrongShape = rows.filter((r) => !/-(bg|en)$/.test(r.slug));
  if (wrongShape.length) {
    console.error("✋ Abort: some target slugs don't match the -bg/-en ghost shape:", wrongShape.map((r) => r.slug).join(", "));
    await prisma.$disconnect();
    process.exit(3);
  }

  await mkdir(CACHE, { recursive: true });
  const dump = path.join(CACHE, `ghost-pages-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(dump, JSON.stringify(rows, null, 2));
  console.log(`Recoverable dump → ${dump}`);

  // 3) Delete in a transaction, by exact id, with an == 14 assertion (rolls back otherwise).
  const deleted = await prisma.$transaction(async (tx) => {
    await tx.page.updateMany({ where: { id: { in: GHOST_IDS } }, data: { currentVersionId: null } });
    const v = await tx.pageVersion.deleteMany({ where: { pageId: { in: GHOST_IDS } } });
    const p = await tx.page.deleteMany({ where: { id: { in: GHOST_IDS } } });
    if (p.count !== GHOST_IDS.length) {
      throw new Error(`Deleted ${p.count} pages, expected ${GHOST_IDS.length} — rolling back.`);
    }
    return { pages: p.count, versions: v.count };
  });

  console.log(`✓ Purged ${deleted.pages} ghost pages (+${deleted.versions} versions). Transaction committed.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
