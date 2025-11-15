#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.page.findMany();
  console.log(`Found ${pages.length} pages; creating snapshots if missing...`);
  for (const p of pages) {
    const count = await prisma.pageVersion.count({ where: { pageId: p.id } });
    if (count > 0) {
      continue;
    }
    const pv = await prisma.pageVersion.create({
      data: {
        pageId: p.id,
        version: 1,
        title: p.title,
        excerpt: p.excerpt,
        bodyMarkdown: p.bodyMarkdown,
        blocks: p.blocks,
        published: !!p.published,
        createdById: p.authorId || null,
      },
    });
    if (p.published) {
      await prisma.page.update({ where: { id: p.id }, data: { currentVersionId: pv.id } });
    }
  }
  console.log('Snapshots done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
