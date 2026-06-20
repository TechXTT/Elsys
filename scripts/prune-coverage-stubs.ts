/* eslint-disable no-console */
// Delete the EN coverage-stub rows left by the old read-time nav factory: rows
// that are DRAFT, machineTranslated=false, have a bg sibling (by direct or
// alias-normalized slug), and whose body AND navLabel are empty or a verbatim
// copy of that bg sibling (i.e. never actually translated). KEEPs anything
// published, machine-translated, or with a translated body/label. Capture-first,
// delete by EXACT id, assert all selected are DRAFT, read-back count==0, flush
// nav caches.  pnpm prune:coverage-stubs
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const CACHE = path.join(process.cwd(), "scripts/.cache");
const ALIAS: Record<string, string> = { "uchenicheski-jivot": "uchenicheski-zhivot", documents: "dokumenti" };
const norm = (s: string) => { const i = s.indexOf("/"); if (i < 0) return ALIAS[s] ?? s; return (ALIAS[s.slice(0, i)] ?? s.slice(0, i)) + s.slice(i); };
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
  const en = await prisma.page.findMany({ where: { locale: "en" }, select: { id: true, slug: true, status: true, published: true, machineTranslated: true, bodyMarkdown: true, navLabel: true } });
  const bg = new Map((await prisma.page.findMany({ where: { locale: "bg" }, select: { slug: true, bodyMarkdown: true, navLabel: true } })).map((r) => [r.slug, r]));

  const stubs = en.filter((r) => {
    if (r.machineTranslated) return false;
    if (r.status !== "DRAFT" || r.published) return false; // published = keep (guard); real seed roots etc.
    const sib = bg.get(r.slug) ?? bg.get(norm(r.slug));
    if (!sib) return false;
    const bodyStub = t(r.bodyMarkdown).length === 0 || t(r.bodyMarkdown) === t(sib.bodyMarkdown);
    const labelStub = t(r.navLabel).length === 0 || t(r.navLabel) === t(sib.navLabel);
    return bodyStub && labelStub;
  });

  console.log(`Selected ${stubs.length} EN coverage stubs (DRAFT, untranslated).`);
  // Guard: every selected row MUST be DRAFT/unpublished.
  const published = stubs.filter((r) => r.status !== "DRAFT" || r.published);
  if (published.length) {
    console.error("✋ Abort: selected set contains published rows:", published.map((r) => r.slug).join(", "));
    await prisma.$disconnect(); process.exit(2);
  }
  if (!stubs.length) { console.log("Nothing to prune."); await flushNavCache(); await prisma.$disconnect(); return; }

  await mkdir(CACHE, { recursive: true });
  const dump = path.join(CACHE, `coverage-stubs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(dump, JSON.stringify(stubs, null, 2));
  console.log(`Capture → ${dump}`);

  const ids = stubs.map((r) => r.id);
  const deleted = await prisma.$transaction(async (tx) => {
    await tx.page.updateMany({ where: { id: { in: ids } }, data: { currentVersionId: null } });
    const v = await tx.pageVersion.deleteMany({ where: { pageId: { in: ids } } });
    const p = await tx.page.deleteMany({ where: { id: { in: ids } } });
    if (p.count !== ids.length) throw new Error(`Deleted ${p.count}, expected ${ids.length} — rolling back.`);
    return { pages: p.count, versions: v.count };
  });
  console.log(`✓ Deleted ${deleted.pages} stub pages (+${deleted.versions} versions).`);

  const remaining = await prisma.page.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (remaining.length !== 0) { console.error(`✋ Read-back FAILED: ${remaining.length} remain.`); await prisma.$disconnect(); process.exit(4); }
  console.log("✓ Read-back: 0 selected stub rows remain.");
  await flushNavCache();
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
