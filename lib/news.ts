import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { isPublic, publicWhere, statusFromPublished } from "@/lib/content/shared";
import type { PostItem } from "@/lib/types";

const NEWS_CACHE_NAMESPACE = "news";
const LIST_TTL_MS = 60_000; // 60s in memory; 5× in Redis (see lib/cache.ts)

/** Orphans every cached news read; call from admin mutations BEFORE revalidatePath. */
export async function invalidateNewsCache(): Promise<void> {
  await bumpCacheVersion(NEWS_CACHE_NAMESPACE);
}

/**
 * Full post-mutation refresh: bump the cache version FIRST (so rebuilt pages
 * re-read the DB), then revalidate the news surfaces for every locale.
 */
export async function revalidateNews(slugs: string[] = []): Promise<void> {
  await invalidateNewsCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/novini`);
    for (const slug of slugs) revalidatePath(`/${loc}/novini/${slug}`);
  }
}

type ImageMeta = NonNullable<PostItem["images"]>[number];

interface NewsRow {
  id: string; // slug
  locale: string;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string;
  blocks: unknown[] | null;
  useBlocks: boolean;
  date: Date;
  images: ImageMeta[] | null;
  featuredImage: string | null;
  published: boolean;
  status?: string;
  category?: string | null;
  colorTag?: import("@prisma/client").ColorTag | null;
  categoryPage?: { title: string } | null;
  machineTranslated?: boolean;
  author?: { name: string | null } | null;
}

function toPostItem(row: NewsRow): PostItem {
  const images = (row.images ?? undefined) as PostItem["images"] | undefined;
  const image = row.featuredImage ?? images?.[0]?.url;
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    date: row.date?.toISOString?.() ?? undefined,
    href: `/novini/${row.id}`,
    image,
    images,
    published: row.published,
    status: row.status ?? undefined,
    // M2.4: effective category = linked parent Page's title, else free-text.
    category: row.categoryPage?.title ?? row.category ?? undefined,
    colorTag: row.colorTag ?? undefined,
    machineTranslated: row.machineTranslated ?? false,
  };
}

export async function getNewsPosts(locale?: Locale, includeDrafts = false): Promise<PostItem[]> {
  const loc = (locale ?? defaultLocale) as string;
  const cacheKey = `${NEWS_CACHE_NAMESPACE}:list:${loc}:${includeDrafts ? 'all' : 'pub'}`;
  return getCached(cacheKey, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      // Fetch from the requested locale first
      const now = new Date();
      const primaryRows: NewsRow[] = await (prisma as any).newsPost.findMany({
        where: {
          locale: loc,
          // Public reads: status PUBLISHED + date <= now (scheduling stays date-encoded).
          ...(includeDrafts ? {} : publicWhere({ gateDate: true, now })),
        },
        orderBy: { date: "desc" },
        select: { id: true, locale: true, title: true, excerpt: true, bodyMarkdown: true, blocks: true, useBlocks: true, date: true, images: true, featuredImage: true, published: true, status: true, category: true, colorTag: true, categoryPage: { select: { title: true } }, machineTranslated: true },
      });

      // If locale is not default, also fetch defaults to fill gaps (only when not includeDrafts)
      let fallbackRows: NewsRow[] = [];
      if (loc !== defaultLocale && !includeDrafts) {
        fallbackRows = await (prisma as any).newsPost.findMany({
          where: {
            locale: defaultLocale,
            ...publicWhere({ gateDate: true, now }),
          },
          orderBy: { date: "desc" },
          select: { id: true, locale: true, title: true, excerpt: true, bodyMarkdown: true, blocks: true, useBlocks: true, date: true, images: true, featuredImage: true, published: true, status: true, category: true, colorTag: true, categoryPage: { select: { title: true } }, machineTranslated: true },
        });
      }

      // Merge: primary locale takes precedence, fallback fills gaps
      const seenIds = new Set(primaryRows.map(r => r.id));
      const effective = [...primaryRows, ...fallbackRows.filter(r => !seenIds.has(r.id))];
      effective.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return effective.map(toPostItem);
    },
  });
}

export async function getNewsPost(slug: string, locale?: Locale, includeDrafts = false): Promise<{ post: PostItem; markdown: string; blocks: unknown[] | null; useBlocks: boolean; published: boolean; authorName: string | null; contentLocale: string } | null> {
  const loc = (locale ?? defaultLocale) as string;
  const localesToFetch = loc === defaultLocale ? [loc] : [loc, defaultLocale];
  const rows: NewsRow[] = await (prisma as any).newsPost.findMany({
    where: { id: slug, locale: { in: localesToFetch } },
    select: { id: true, locale: true, title: true, excerpt: true, bodyMarkdown: true, blocks: true, useBlocks: true, date: true, images: true, featuredImage: true, published: true, status: true, category: true, colorTag: true, categoryPage: { select: { title: true } }, author: { select: { name: true } } },
  });
  const now = new Date();
  // Public visibility: status PUBLISHED + date not in the future (canonical helper).
  const isPubliclyVisible = (row: NewsRow) => isPublic(row, now);

  const pick = (row: NewsRow) => ({ post: toPostItem(row), markdown: row.bodyMarkdown, blocks: row.blocks, useBlocks: row.useBlocks, published: row.published, authorName: row.author?.name ?? null, contentLocale: row.locale });
  const primary = rows.find(r => r.locale === loc);
  if (primary && (includeDrafts || isPubliclyVisible(primary))) return pick(primary);
  const fb = rows.find(r => r.locale === defaultLocale);
  if (fb && (includeDrafts || isPubliclyVisible(fb))) return pick(fb);
  return null;
}

/** N most-recent published posts for the requested locale (cached list). */
export async function getLatestNews(locale?: Locale, limit = 3): Promise<PostItem[]> {
  return (await getNewsPosts(locale)).slice(0, limit);
}

/** Up to `limit` published posts other than `slug` (cached list) — "related news". */
export async function getRelatedNews(slug: string, locale?: Locale, limit = 3): Promise<PostItem[]> {
  return (await getNewsPosts(locale)).filter((p) => p.id !== slug).slice(0, limit);
}

/**
 * M2.4: candidate parent Pages that can serve as a news category, for the editor
 * picker. Returns content/folder pages in the locale (id + title), ordered.
 */
export async function getNewsCategoryPages(locale?: Locale): Promise<{ id: string; title: string }[]> {
  const loc = (locale ?? defaultLocale) as string;
  return (prisma as any).page.findMany({
    where: { locale: loc, kind: { in: ["PAGE", "FOLDER"] } },
    select: { id: true, title: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });
}

export async function createNewsPost(input: {
  slug: string;
  locale?: Locale;
  title: string;
  excerpt?: string;
  markdown: string;
  blocks?: unknown[] | null;
  useBlocks?: boolean;
  date: Date;
  images?: ImageMeta[];
  featuredImage?: string | null;
  authorId?: string;
  published?: boolean;
  /** Mark as an unreviewed machine translation (J). Defaults to false. */
  machineTranslated?: boolean;
}) {
  const localeValue = input.locale ?? defaultLocale;
  const row: NewsRow = await (prisma as any).newsPost.create({
    data: {
      id: input.slug,
      locale: localeValue,
      title: input.title,
      excerpt: input.excerpt ?? null,
      bodyMarkdown: input.markdown,
      blocks: input.blocks ?? null,
      useBlocks: input.useBlocks ?? false,
      date: input.date,
      images: input.images ?? null,
      featuredImage: input.featuredImage ?? null,
      published: input.published ?? true,
      status: statusFromPublished(input.published ?? true),
      machineTranslated: input.machineTranslated ?? false,
      authorId: input.authorId ?? null,
    },
  });

  // Create initial version snapshot (shared across locales)
  if (input.authorId) {
    try {
      // Check if this is the first locale being created for this slug
      const versionCount = await (prisma as any).newsPostVersion.count({
        where: { newsPostId: input.slug }
      });

      // Only create version 1 if this is the first locale
      if (versionCount === 0) {
        await (prisma as any).newsPostVersion.create({
          data: {
            newsPostId: input.slug,
            version: 1,
            title: input.title,
            excerpt: input.excerpt ?? null,
            bodyMarkdown: input.markdown,
            blocks: input.blocks ?? null,
            useBlocks: input.useBlocks ?? false,
            date: input.date,
            images: input.images ?? null,
            featuredImage: input.featuredImage ?? null,
            published: input.published ?? true,
            createdById: input.authorId,
          },
        });
      }
    } catch (error) {
      console.error('Failed to create initial news post version', error);
    }
  }

  return toPostItem(row);
}

export async function updateNewsPost(args: {
  currentSlug: string;
  slug: string;
  locale?: Locale;
  title: string;
  excerpt?: string;
  markdown: string;
  blocks?: unknown[] | null;
  useBlocks?: boolean;
  date: Date;
  images?: ImageMeta[];
  featuredImage?: string | null;
  authorId?: string;
  published?: boolean;
  /**
   * Review state for the machine-translation flag (J). Omitted on a normal
   * editor save → defaults to false, which clears the "за преглед" badge once a
   * human has saved/published the row.
   */
  machineTranslated?: boolean;
}) {
  const localeValue = args.locale ?? defaultLocale;

  // Create version snapshot before updating (shared across locales)
  if (args.authorId) {
    try {
      const versionCount = await (prisma as any).newsPostVersion.count({
        where: { newsPostId: args.currentSlug }
      });
      const nextVersion = versionCount + 1;
      await (prisma as any).newsPostVersion.create({
        data: {
          newsPostId: args.currentSlug,
          version: nextVersion,
          title: args.title,
          excerpt: args.excerpt ?? null,
          bodyMarkdown: args.markdown,
          blocks: args.blocks ?? null,
          useBlocks: args.useBlocks ?? false,
          date: args.date,
          images: args.images ?? null,
          featuredImage: args.featuredImage ?? null,
          published: args.published ?? true,
          createdById: args.authorId,
        },
      });
    } catch (error) {
      console.error('Failed to create news post version snapshot', error);
    }
  }

  if (args.slug !== args.currentSlug) {
    // slug change: create new then delete old to avoid PK update pitfalls
    const created: NewsRow = await (prisma as any).newsPost.create({
      data: {
        id: args.slug,
        locale: localeValue,
        title: args.title,
        excerpt: args.excerpt ?? null,
        bodyMarkdown: args.markdown,
        blocks: args.blocks ?? null,
        useBlocks: args.useBlocks ?? false,
        date: args.date,
        images: args.images ?? null,
        featuredImage: args.featuredImage ?? null,
        published: args.published ?? true,
        status: statusFromPublished(args.published ?? true),
        machineTranslated: args.machineTranslated ?? false,
        authorId: args.authorId ?? null,
      },
    });
    await (prisma as any).newsPost.delete({ where: { id_locale: { id: args.currentSlug, locale: localeValue } } });
    return toPostItem(created);
  }
  const updated: NewsRow = await (prisma as any).newsPost.update({
    where: { id_locale: { id: args.currentSlug, locale: localeValue } },
    data: {
      title: args.title,
      excerpt: args.excerpt ?? null,
      bodyMarkdown: args.markdown,
      blocks: args.blocks ?? null,
      useBlocks: args.useBlocks ?? false,
      date: args.date,
      images: args.images ?? null,
      featuredImage: args.featuredImage ?? null,
      published: args.published ?? true,
      status: statusFromPublished(args.published ?? true),
      machineTranslated: args.machineTranslated ?? false,
      authorId: args.authorId ?? null,
    },
  });
  return toPostItem(updated);
}

export async function existsNewsSlug(slug: string, locale?: Locale): Promise<boolean> {
  const localeValue = locale ?? defaultLocale;
  const row = await (prisma as any).newsPost.findUnique({ where: { id_locale: { id: slug, locale: localeValue } } });
  return !!row;
}