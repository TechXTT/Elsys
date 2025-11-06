// List CMS Page counts grouped by locale and section, with a few sample slugs
// Usage:
//   PRISMA_DATABASE_URL=... node scripts/list-cms-pages.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sectionOf(slug = "") {
  const idx = slug.indexOf("/");
  return idx === -1 ? slug : slug.slice(0, idx);
}

(async () => {
  try {
    const pages = await prisma.page.findMany({
      orderBy: [{ locale: "asc" }, { slug: "asc" }],
    });
    const grouped = new Map();
    for (const p of pages) {
      const key = `${p.locale}::${sectionOf(p.slug)}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(p);
    }
    console.log("CMS Pages summary:");
    const keys = Array.from(grouped.keys()).sort();
    for (const key of keys) {
      const [locale, section] = key.split("::");
      const arr = grouped.get(key) || [];
      console.log(`  ${locale}/${section}: ${arr.length}`);
      const samples = arr.slice(0, 5).map((p) => p.slug).join(", ");
      if (samples) console.log(`    e.g.: ${samples}`);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
