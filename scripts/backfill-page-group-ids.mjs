#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('[backfill-group] start');
  const pages = await prisma.page.findMany({ select: { id: true, groupId: true } });
  const missing = pages.filter(p => !p.groupId);
  console.log(`[backfill-group] pages: ${pages.length}, missing groupId: ${missing.length}`);
  const batchSize = 200;
  for (let i = 0; i < missing.length; i += batchSize) {
    const slice = missing.slice(i, i + batchSize);
    await prisma.$transaction(
      slice.map(p => prisma.page.update({ where: { id: p.id }, data: { groupId: `G|${p.id}` } }))
    );
    console.log(`[backfill-group] updated ${Math.min(i + batchSize, missing.length)}/${missing.length}`);
  }
  console.log('[backfill-group] done');
}

main().catch(err => { console.error(err); process.exit(1); });
