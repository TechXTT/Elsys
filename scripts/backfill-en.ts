/**
 * One-time backfill (J): DeepL-translate existing BG CMS pages + news into EN
 * review-drafts (status=DRAFT, machineTranslated=true) so editors can review and
 * publish, and /en progressively stops falling back.
 *
 * Idempotent: skips any item that already has an EN row (never clobbers human
 * OR existing machine drafts). Excludes the legal pages (human translation only).
 * Env-gated on DEEPL_API_KEY; exits with a clear message if absent.
 *
 *   pnpm i18n:backfill-en
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { isDeeplConfigured, translateText, translateBlocks } from "../lib/deepl";

const LEGAL_SLUGS = new Set(["poveritelnost", "biskvitki", "dostapnost"]);
const prisma = new PrismaClient();

type Tr = { text: string | null; chars: number };
const tr = (s: string | null | undefined): Promise<Tr> =>
  s ? translateText(s, { source: "bg", target: "en" }) : Promise.resolve({ text: s ?? null, chars: 0 });

async function main() {
  if (!isDeeplConfigured()) {
    console.error(
      "✗ DEEPL_API_KEY липсва. Задайте го в средата, за да изпълните машинния backfill на EN.",
    );
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;
  let totalChars = 0;

  // --- CMS pages (kind PAGE, bg) --------------------------------------------
  const pages = await prisma.page.findMany({ where: { locale: "bg", kind: "PAGE" } });
  for (const p of pages) {
    if (LEGAL_SLUGS.has(p.slug)) {
      skipped++;
      console.log(`· skip page /${p.slug} (legal — human translation only)`);
      continue;
    }
    const en = await prisma.page.findUnique({
      where: { slug_locale: { slug: p.slug, locale: "en" } },
      select: { slug: true },
    });
    if (en) {
      skipped++;
      console.log(`· skip page /${p.slug} (EN row already exists)`);
      continue;
    }
    const [title, excerpt, markdown, blk] = await Promise.all([
      tr(p.title),
      tr(p.excerpt),
      tr(p.bodyMarkdown),
      translateBlocks(p.blocks, { source: "bg", target: "en" }),
    ]);
    const chars = title.chars + excerpt.chars + markdown.chars + blk.chars;
    await prisma.page.create({
      data: {
        slug: p.slug,
        locale: "en",
        groupId: p.groupId ?? p.id,
        title: title.text ?? p.title,
        excerpt: excerpt.text,
        bodyMarkdown: markdown.text,
        blocks: blk.blocks as any,
        kind: p.kind,
        published: false,
        status: "DRAFT",
        machineTranslated: true,
        authorId: p.authorId,
      },
    });
    created++;
    totalChars += chars;
    console.log(`✓ page /${p.slug} → EN draft (${chars} chars)`);
  }

  // --- News (bg) ------------------------------------------------------------
  const news = await prisma.newsPost.findMany({ where: { locale: "bg" } });
  for (const n of news) {
    const en = await prisma.newsPost.findUnique({
      where: { id_locale: { id: n.id, locale: "en" } },
      select: { id: true },
    });
    if (en) {
      skipped++;
      console.log(`· skip news ${n.id} (EN row already exists)`);
      continue;
    }
    const [title, excerpt, markdown, blk] = await Promise.all([
      tr(n.title),
      tr(n.excerpt),
      tr(n.bodyMarkdown),
      translateBlocks(n.blocks, { source: "bg", target: "en" }),
    ]);
    const chars = title.chars + excerpt.chars + markdown.chars + blk.chars;
    await prisma.newsPost.create({
      data: {
        id: n.id,
        locale: "en",
        title: title.text ?? n.title,
        excerpt: excerpt.text,
        bodyMarkdown: markdown.text ?? "",
        blocks: blk.blocks as any,
        useBlocks: n.useBlocks,
        date: n.date,
        images: n.images as any,
        featuredImage: n.featuredImage,
        category: n.category,
        colorTag: n.colorTag,
        published: false,
        status: "DRAFT",
        machineTranslated: true,
        authorId: n.authorId,
      },
    });
    created++;
    totalChars += chars;
    console.log(`✓ news ${n.id} → EN draft (${chars} chars)`);
  }

  console.log(
    `\nBackfill complete — created ${created} EN review-draft(s), skipped ${skipped}. ` +
      `Total DeepL source characters: ${totalChars.toLocaleString("en-US")} ` +
      `(Free tier ≈ 500,000/mo).`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Backfill failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
