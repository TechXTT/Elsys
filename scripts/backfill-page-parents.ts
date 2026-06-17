/* eslint-disable no-console */
// One-off maintenance backfill: link Page.parentId on EXISTING rows from their
// hierarchical slug, so the admin nav tree nests without a re-import. Idempotent
// — only fills a NULL parentId (never clobbers a parent an admin set by hand).
// Reuses the same linkPageParents() the importer runs (single source of truth).
//   pnpm import:link-parents
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { linkPageParents } from "./import/importer";

async function main() {
  const prisma = new PrismaClient();
  console.log("Backfilling Page.parentId from hierarchical slugs (fills NULL parents only)…");
  const res = await linkPageParents(prisma, { log: (m) => console.log(m) });
  console.log(`\nDone. linked=${res.linked}, alreadyLinked=${res.alreadyLinked}, orphans=${res.orphans.length}`);
  if (res.orphans.length) console.log("Orphans (parent slug not found):", res.orphans.join(", "));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
