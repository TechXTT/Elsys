#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(process.cwd(), 'content');
const locales = ['bg', 'en'];

function loadJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function loadMarkdownSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

async function run() {
  const summary = [];
  for (const locale of locales) {
    const indexPath = path.join(contentDir, locale, 'news', 'index.json');
    const posts = loadJsonSafe(indexPath);
    if (!Array.isArray(posts)) {
      summary.push({ locale, found: 0, imported: 0 });
      continue;
    }
    let imported = 0;
    for (const p of posts) {
      const slug = p.id;
      if (!slug || typeof slug !== 'string') continue;
      const mdPath = path.join(contentDir, locale, 'news', `${slug}.md`);
      const markdown = loadMarkdownSafe(mdPath) || '';
      const dateIso = p.date && typeof p.date === 'string' ? p.date : new Date().toISOString();
      const dateObj = new Date(dateIso);
      if (Number.isNaN(dateObj.getTime())) continue;
      try {
        await prisma.newsPost.upsert({
          where: { id_locale: { id: slug, locale } },
          update: {
            title: p.title || slug,
            excerpt: p.excerpt ?? null,
            bodyMarkdown: markdown,
            date: dateObj,
            images: Array.isArray(p.images) ? p.images : null,
            featuredImage: p.image ?? (Array.isArray(p.images) ? p.images[0]?.url : null),
          },
          create: {
            id: slug,
            locale,
            title: p.title || slug,
            excerpt: p.excerpt ?? null,
            bodyMarkdown: markdown,
            date: dateObj,
            images: Array.isArray(p.images) ? p.images : null,
            featuredImage: p.image ?? (Array.isArray(p.images) ? p.images[0]?.url : null),
          },
        });
        imported += 1;
      } catch (err) {
        console.error('Failed to import', locale, slug, err.message);
      }
    }
    summary.push({ locale, found: posts.length, imported });
  }
  console.log('News import summary:');
  for (const row of summary) {
    console.log(`${row.locale}: imported ${row.imported}/${row.found}`);
  }
  await prisma.$disconnect();
}

run().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });