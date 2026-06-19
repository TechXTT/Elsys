/* eslint-disable no-console */
// Merge Page.groupId for existing same-slug cross-locale pairs so the admin nav
// builder sees ONE group per logical page (bg+en together). The seed's navRoots
// loop created bg+en with the same slug but separate groupIds, which made the
// (now removed) read-time coverage synthesize locale-suffixed ghost clones.
// groupId-MERGE ONLY — no row deletion (that's purge:ghosts). Idempotent,
// capture-first, read-back assert.  pnpm nav:merge-groups
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const CACHE = path.join(process.cwd(), "scripts/.cache");
const NAV_ROOTS = new Set(["novini", "priem", "obuchenie", "uchilishteto", "uchenicheski-zhivot", "blog", "evroproekti"]);

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.page.findMany({ select: { id: true, slug: true, locale: true, groupId: true } });

  // Group by slug; a slug present in ≥2 locales with >1 distinct group needs merging.
  const bySlug = new Map<string, typeof rows>();
  for (const r of rows) { if (!bySlug.has(r.slug)) bySlug.set(r.slug, []); bySlug.get(r.slug)!.push(r); }

  const toMerge: { slug: string; canonical: string; rows: typeof rows }[] = [];
  for (const [slug, grp] of bySlug) {
    if (grp.length < 2) continue;
    const distinct = new Set(grp.map((r) => r.groupId ?? r.id));
    if (distinct.size <= 1) continue; // already one group
    const bg = grp.find((r) => r.locale === "bg");
    const canonical = NAV_ROOTS.has(slug) ? `navroot-${slug}` : (bg?.groupId ?? bg?.id ?? grp[0].groupId ?? grp[0].id);
    toMerge.push({ slug, canonical, rows: grp });
  }

  if (!toMerge.length) { console.log("No split same-slug groups to merge. ✓"); await prisma.$disconnect(); return; }

  // Capture-first.
  await mkdir(CACHE, { recursive: true });
  const dump = path.join(CACHE, `nav-groupid-merge-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(dump, JSON.stringify(toMerge, null, 2));
  console.log(`Merging ${toMerge.length} split same-slug group(s). Capture → ${dump}`);

  let updated = 0;
  for (const m of toMerge) {
    for (const r of m.rows) {
      if ((r.groupId ?? r.id) === m.canonical) continue;
      await prisma.page.update({ where: { id: r.id }, data: { groupId: m.canonical } });
      updated++;
    }
    console.log(`  ${m.slug} → groupId ${m.canonical} (${m.rows.map((r) => r.locale).join("+")})`);
  }
  console.log(`Updated ${updated} rows.`);

  // Read-back assert: no slug has >1 distinct groupId across locales.
  const after = await prisma.page.findMany({ select: { slug: true, locale: true, groupId: true, id: true } });
  const stillSplit: string[] = [];
  const m2 = new Map<string, Set<string>>();
  for (const r of after) {
    if (!m2.has(r.slug)) m2.set(r.slug, new Set());
    m2.get(r.slug)!.add(r.groupId ?? r.id);
  }
  for (const [slug, gids] of m2) {
    const cnt = after.filter((r) => r.slug === slug).length;
    if (cnt >= 2 && gids.size > 1) stillSplit.push(slug);
  }
  if (stillSplit.length) {
    console.error("✋ Read-back FAILED: still-split slugs:", stillSplit.join(", "));
    await prisma.$disconnect();
    process.exit(4);
  }
  console.log("✓ Read-back: every multi-locale slug shares one groupId.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
