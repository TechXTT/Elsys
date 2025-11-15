#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function main() {
  // Load static nav structure and i18n labels
  const navPath = path.join(root, 'lib', 'nav.ts');
  const bgMessagesPath = path.join(root, 'messages', 'bg.json');
  const enMessagesPath = path.join(root, 'messages', 'en.json');

  if (!fs.existsSync(bgMessagesPath) || !fs.existsSync(enMessagesPath)) {
    console.error('Missing messages files');
    process.exit(1);
  }

  const bg = JSON.parse(fs.readFileSync(bgMessagesPath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enMessagesPath, 'utf8'));
  const tBg = bg?.Nav || {};
  const tEn = en?.Nav || {};

  // Read and extract array literal after 'export const nav' (with optional type annotation)
  const navSrc = fs.readFileSync(navPath, 'utf8');
  let arrayLiteral;
  let match = navSrc.match(/export const nav(?:\s*:[^=]+)?\s*=\s*(\[[\s\S]*?\]);/);
  if (match) {
    arrayLiteral = match[1];
  } else {
    // Fallback: find the first '[' after the declaration and match brackets
    const declIdx = navSrc.indexOf('export const nav');
    if (declIdx === -1) {
      console.error('Failed to find nav declaration in lib/nav.ts');
      process.exit(1);
    }
    const eqIdx = navSrc.indexOf('=', declIdx);
    if (eqIdx === -1) {
      console.error('Failed to find nav assignment in lib/nav.ts');
      process.exit(1);
    }
    const startBracket = navSrc.indexOf('[', eqIdx);
    if (startBracket === -1) {
      console.error('Failed to find nav array start in lib/nav.ts');
      process.exit(1);
    }
    let depth = 0;
    let end = -1;
    for (let i = startBracket; i < navSrc.length; i++) {
      const ch = navSrc[i];
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) {
      console.error('Failed to match nav array brackets in lib/nav.ts');
      process.exit(1);
    }
    arrayLiteral = navSrc.slice(startBracket, end + 1) + ';';
  }
  // eslint-disable-next-line no-new-func
  const nav = Function(`return (${arrayLiteral});`)();

  console.log(`Seeding navigation with ${nav.length} top-level items...`);

  // Clean existing
  const all = await prisma.navigationItem.findMany();
  if (all.length) {
    console.log(`Clearing ${all.length} existing items...`);
    await prisma.$transaction([
      prisma.navigationItem.deleteMany({}),
    ]);
  }

  // Build items recursively
  let order = 0;
  async function createNode(node, parentId = null) {
    const key = node.key;
    const href = node.href || null;
    const labels = { bg: tBg[key] || key, en: tEn[key] || key };
    const data = {
      parentId,
      order: order++,
      slug: href && href.startsWith('/') ? href.slice(1) : href,
      externalUrl: href && href.startsWith('http') ? href : null,
      visible: true,
      accessRole: null,
      labels,
      meta: null,
    };
    const created = await prisma.navigationItem.create({ data });
    if (node.children && node.children.length) {
      for (const child of node.children) {
        await createNode(child, created.id);
      }
    }
  }

  for (const top of nav) {
    await createNode(top, null);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
