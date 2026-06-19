/* eslint-disable no-console */
// Remove the 5 PUBLISHED but untranslated EN coverage stubs the old nav factory
// left behind (empty body, Bulgarian title, no real EN content). Explicit
// allowlist (never a pattern). Unpublish → delete in one transaction so the bg
// page projects virtually as "needs translation" in the EN tab. Aborts if any
// target has real EN content (translated/non-empty body or label). Capture-first,
// read-back assert count==0, flush nav caches.  pnpm prune:published-en-stubs
//
// The 3 EN legal stubs (poveritelnost/biskvitki/dostapnost) are intentionally
// NOT here — human-translation-only; tracked in docs/launch-runbook.md §4.
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const CACHE = path.join(process.cwd(), "scripts/.cache");
const TARGET_SLUGS = ["dokumenti", "za-uchilishteto", "klubove", "novini-sabitiya", "za-uchilishteto-route"];
const t = (s: string | null) => (s ?? "").trim();

async function flushNavCache() {
  if (!process.env.REDIS_URL) { console.log("   (no REDIS_URL — skip cache flush)"); return; }
  const { default: Redis } = await import("ioredis");
  const r = new Redis(process.env.REDIS_URL);
  let n = 0;
  for (const pat of ["nav-tree:*", "cache:*"]) { const ks = await r.keys(pat); if (ks.length) { await r.del(...ks); n += ks.length; } }
  await r.quit();
  console.log(`   flushed ${n} nav/content cache keys`);
}

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.page.findMany({ where: { locale: "en", slug: { in: TARGET_SLUGS } } });
  const bg = new Map((await prisma.page.findMany({ where: { locale: "bg", slug: { in: TARGET_SLUGS } }, select: { slug: true, bodyMarkdown: true, navLabel: true } })).map((r) => [r.slug, r]));

  console.log(`Matched ${rows.length} EN rows for ${TARGET_SLUGS.length} target slugs.`);
  // Abort if any target has REAL EN content (a non-empty body that differs from bg,
  // a machine translation, or a translated navLabel).
  const realContent = rows.filter((r) => {
    if (r.machineTranslated) return true;
    const sib = bg.get(r.slug);
    const bodyStub = t(r.bodyMarkdown).length === 0 || t(r.bodyMarkdown) === t(sib?.bodyMarkdown ?? null);
    const labelStub = t(r.navLabel).length === 0 || t(r.navLabel) === t(sib?.navLabel ?? null);
    return !(bodyStub && labelStub);
  });
  if (realContent.length) {
    console.error("✋ Abort: real EN content found, not deleting:", realContent.map((r) => r.slug).join(", "));
    await prisma.$disconnect(); process.exit(2);
  }
  if (!rows.length) { console.log("Nothing to prune."); await flushNavCache(); await prisma.$disconnect(); return; }

  await mkdir(CACHE, { recursive: true });
  const dump = path.join(CACHE, `published-en-stubs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(dump, JSON.stringify(rows, null, 2));
  console.log(`Capture → ${dump}`);
  for (const r of rows) console.log(`  ${r.id} en/${r.slug} title=${JSON.stringify(r.title)}`);

  const ids = rows.map((r) => r.id);
  const deleted = await prisma.$transaction(async (tx) => {
    // Unpublish first (explicit, per request), then remove.
    await tx.page.updateMany({ where: { id: { in: ids } }, data: { published: false, status: "DRAFT", currentVersionId: null } });
    const v = await tx.pageVersion.deleteMany({ where: { pageId: { in: ids } } });
    const p = await tx.page.deleteMany({ where: { id: { in: ids } } });
    if (p.count !== ids.length) throw new Error(`Deleted ${p.count}, expected ${ids.length} — rolling back.`);
    return { pages: p.count, versions: v.count };
  });
  console.log(`✓ Unpublished + deleted ${deleted.pages} stub pages (+${deleted.versions} versions).`);

  const remaining = await prisma.page.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (remaining.length !== 0) { console.error(`✋ Read-back FAILED: ${remaining.length} remain.`); await prisma.$disconnect(); process.exit(4); }
  console.log("✓ Read-back: 0 target rows remain.");
  await flushNavCache();
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
