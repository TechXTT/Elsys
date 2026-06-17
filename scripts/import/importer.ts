/* eslint-disable no-console */
import type { PrismaClient } from "@prisma/client";
import { slugify } from "../../lib/slug";
import { importImage } from "./media";
import type { ExtractedNews, ExtractedPage } from "./extract";

// Idempotent importers (G4 / M4.1). Upsert by the natural key (slug+locale),
// keeping legacyId + legacyUrl. Imported content lands DRAFT (never auto-
// published). Body images are migrated to Blob and the markdown is rewritten.

const IMPORT_LOCALE = "bg";

export interface ImportItemResult {
  ok: boolean;
  slug: string;
  mediaImported: number;
  missingAlt: number;
  missingDate?: boolean;
}

function legacyPath(url: string): string {
  try { return new URL(url).pathname.replace(/^\/+|\/+$/g, ""); } catch { return url; }
}

/** Migrate body images to Blob, rewrite markdown src, return featured + counts. */
async function migrateImages(
  prisma: PrismaClient,
  images: { src: string; alt: string }[],
  markdown: string,
  featured: string | null,
  folder: string,
  userId: string | null,
  dryRun: boolean
): Promise<{ markdown: string; featured: string | null; media: { name: string; url: string; size: "full" }[]; imported: number; missingAlt: number }> {
  let md = markdown;
  let feat = featured;
  const media: { name: string; url: string; size: "full" }[] = [];
  let imported = 0;
  let missingAlt = 0;
  for (const img of images) {
    let res: Awaited<ReturnType<typeof importImage>> = null;
    try {
      res = await importImage(prisma, img.src, img.alt, folder, userId, { dryRun });
    } catch (err) {
      console.warn(`  media import failed ${img.src}: ${(err as Error).message}`);
    }
    if (!res) continue;
    imported++;
    if (res.missingAlt) missingAlt++;
    if (!dryRun && res.url !== img.src) {
      md = md.split(img.src).join(res.url);
      if (feat === img.src) feat = res.url;
    }
    media.push({ name: img.alt || img.src.split("/").pop() || "image", url: res.url, size: "full" });
  }
  return { markdown: md, featured: feat, media, imported, missingAlt };
}

export async function upsertNews(
  prisma: PrismaClient,
  e: ExtractedNews,
  dateMap: Map<number, string>,
  userId: string | null,
  opts: { dryRun?: boolean } = {}
): Promise<ImportItemResult> {
  const slug = slugify(e.slug) || `post-${e.legacyId}`;
  const iso = dateMap.get(e.legacyId) ?? null;
  const missingDate = !iso;
  const date = iso ? new Date(iso) : null; // null = "дата липсва" (DRAFT; never fabricated)

  const mig = await migrateImages(prisma, e.images, e.markdown, e.featuredImage, "news", userId, !!opts.dryRun);

  if (!opts.dryRun) {
    const data = {
      title: e.title,
      excerpt: e.markdown.slice(0, 180).replace(/\s+/g, " ").trim() || null,
      bodyMarkdown: mig.markdown,
      date,
      images: mig.media.length ? mig.media : undefined,
      featuredImage: mig.featured,
      published: false,
      status: "DRAFT" as const,
      category: e.category, // "Блог" for blog posts, else null
      legacyId: e.legacyId,
      legacyUrl: e.legacyUrl,
      authorId: userId,
    };
    await prisma.newsPost.upsert({
      where: { id_locale: { id: slug, locale: IMPORT_LOCALE } },
      create: { id: slug, locale: IMPORT_LOCALE, ...data },
      update: data,
    });
  }
  return { ok: true, slug, mediaImported: mig.imported, missingAlt: mig.missingAlt, missingDate };
}

export async function upsertPage(
  prisma: PrismaClient,
  e: ExtractedPage,
  userId: string | null,
  opts: { dryRun?: boolean } = {}
): Promise<ImportItemResult> {
  const leaf = slugify(e.slug) || `page-${e.legacyId ?? Date.now()}`;
  const slug = e.parentSlug ? `${e.parentSlug}/${leaf}` : leaf;
  const mig = await migrateImages(prisma, e.images, e.markdown, null, "general", userId, !!opts.dryRun);

  if (!opts.dryRun) {
    const data = {
      title: e.title,
      excerpt: e.markdown.slice(0, 180).replace(/\s+/g, " ").trim() || null,
      bodyMarkdown: mig.markdown,
      published: false,
      status: "DRAFT" as const,
      kind: "PAGE" as const,
      legacyId: e.legacyId ?? null,
      legacyUrl: e.legacyUrl,
      authorId: userId,
    };
    await prisma.page.upsert({
      where: { slug_locale: { slug, locale: IMPORT_LOCALE } },
      create: { slug, locale: IMPORT_LOCALE, ...data },
      update: data,
    });
  }
  return { ok: true, slug, mediaImported: mig.imported, missingAlt: mig.missingAlt };
}

export interface LinkParentsResult { linked: number; alreadyLinked: number; orphans: string[] }

// Second pass: link Page.parentId from the hierarchical slug (`parent/leaf`).
// upsertPage() stores the full path in `slug` but never sets parentId, so the
// admin nav tree renders flat. The slug is the source of truth; we only fill a
// NULL parentId so a re-run is idempotent and can never clobber a parent an
// admin set by hand in the nav manager. Runs after all rows exist, so multi-
// level nesting and parents-imported-after-children both resolve.
export async function linkPageParents(
  prisma: PrismaClient,
  opts: { log?: (msg: string) => void } = {}
): Promise<LinkParentsResult> {
  const log = opts.log ?? (() => {});
  const pages = await prisma.page.findMany({
    where: { locale: IMPORT_LOCALE },
    select: { id: true, slug: true, parentId: true },
  });
  const idBySlug = new Map<string, string>();
  for (const p of pages) idBySlug.set(p.slug, p.id);

  // Nested pages (slug has a "/"), slug-sorted for deterministic sibling order.
  const nested = pages.filter((p) => p.slug.includes("/"));
  const groups = new Map<string, string[]>();
  for (const p of nested) {
    const parentSlug = p.slug.slice(0, p.slug.lastIndexOf("/"));
    if (!groups.has(parentSlug)) groups.set(parentSlug, []);
    groups.get(parentSlug)!.push(p.slug);
  }
  const orderBySlug = new Map<string, number>();
  for (const slugs of groups.values()) {
    slugs.sort((a, b) => a.localeCompare(b));
    slugs.forEach((s, i) => orderBySlug.set(s, i));
  }

  const result: LinkParentsResult = { linked: 0, alreadyLinked: 0, orphans: [] };
  for (const p of nested) {
    const parentSlug = p.slug.slice(0, p.slug.lastIndexOf("/"));
    const parentId = idBySlug.get(parentSlug) ?? null;
    if (!parentId) { result.orphans.push(p.slug); log(`  orphan (no parent "${parentSlug}"): ${p.slug}`); continue; }
    if (p.parentId) { result.alreadyLinked++; continue; } // never clobber an existing parent
    await prisma.page.update({ where: { id: p.id }, data: { parentId, order: orderBySlug.get(p.slug) ?? 0 } });
    result.linked++;
    log(`  linked ${p.slug} → ${parentSlug} (order ${orderBySlug.get(p.slug) ?? 0})`);
  }
  return result;
}

/** Upsert a legacy→new redirect (idempotent by fromPath). */
export async function persistRedirect(
  prisma: PrismaClient,
  fromUrlOrPath: string,
  toPath: string,
  legacyId: number | null,
  opts: { dryRun?: boolean } = {}
): Promise<void> {
  if (opts.dryRun) return;
  const fromPath = fromUrlOrPath.startsWith("http") ? `/${legacyPath(fromUrlOrPath)}` : fromUrlOrPath;
  await prisma.routeRedirect.upsert({
    where: { fromPath },
    create: { fromPath, toPath, status: 308, legacyId },
    update: { toPath, status: 308, legacyId },
  });
}

export { legacyPath, IMPORT_LOCALE };
