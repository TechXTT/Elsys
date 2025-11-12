import { prisma } from "./prisma";
import { defaultLocale, type Locale } from "@/i18n/config";
import type { PostItem } from "@/lib/types";

type ImageMeta = NonNullable<PostItem["images"]>[number];

interface NewsRow {
  id: string; // slug
  locale: string;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string;
  date: Date;
  images: ImageMeta[] | null;
  featuredImage: string | null;
  published: boolean;
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
  };
}

export async function getNewsPosts(locale?: Locale, includeDrafts = false): Promise<PostItem[]> {
  const loc = (locale ?? defaultLocale) as string;
  // query for requested locale first
  const items: NewsRow[] = await (prisma as any).newsPost.findMany({
    where: { locale: loc, ...(includeDrafts ? {} : { published: true }) },
    orderBy: { date: "desc" },
  });
  if (items.length > 0) return items.map(toPostItem);
  if (locale && locale !== defaultLocale) {
    const fallback: NewsRow[] = await (prisma as any).newsPost.findMany({
      where: { locale: defaultLocale, ...(includeDrafts ? {} : { published: true }) },
      orderBy: { date: "desc" },
    });
    return fallback.map(toPostItem);
  }
  return [];
}

export async function getNewsPost(slug: string, locale?: Locale, includeDrafts = false): Promise<{ post: PostItem; markdown: string; published: boolean } | null> {
  const loc = (locale ?? defaultLocale) as string;
  const row: NewsRow | null = await (prisma as any).newsPost.findUnique({
    where: { id_locale: { id: slug, locale: loc } },
  });
  if (row && (includeDrafts || row.published)) return { post: toPostItem(row), markdown: row.bodyMarkdown, published: row.published };
  if (locale && locale !== defaultLocale) {
    const fb: NewsRow | null = await (prisma as any).newsPost.findUnique({
      where: { id_locale: { id: slug, locale: defaultLocale } },
    });
    if (fb && (includeDrafts || fb.published)) return { post: toPostItem(fb), markdown: fb.bodyMarkdown, published: fb.published };
  }
  return null;
}

export async function createNewsPost(input: {
  slug: string;
  locale?: Locale;
  title: string;
  excerpt?: string;
  markdown: string;
  date: Date;
  images?: ImageMeta[];
  featuredImage?: string | null;
  authorId?: string;
  published?: boolean;
}) {
  const localeValue = input.locale ?? defaultLocale;
  const row: NewsRow = await (prisma as any).newsPost.create({
    data: {
      id: input.slug,
      locale: localeValue,
      title: input.title,
      excerpt: input.excerpt ?? null,
      bodyMarkdown: input.markdown,
      date: input.date,
      images: input.images ?? null,
      featuredImage: input.featuredImage ?? null,
      published: input.published ?? true,
      authorId: input.authorId ?? null,
    },
  });
  return toPostItem(row);
}

export async function updateNewsPost(args: {
  currentSlug: string;
  slug: string;
  locale?: Locale;
  title: string;
  excerpt?: string;
  markdown: string;
  date: Date;
  images?: ImageMeta[];
  featuredImage?: string | null;
  authorId?: string;
  published?: boolean;
}) {
  const localeValue = args.locale ?? defaultLocale;
  if (args.slug !== args.currentSlug) {
    // slug change: create new then delete old to avoid PK update pitfalls
    const created: NewsRow = await (prisma as any).newsPost.create({
      data: {
        id: args.slug,
        locale: localeValue,
        title: args.title,
        excerpt: args.excerpt ?? null,
        bodyMarkdown: args.markdown,
        date: args.date,
        images: args.images ?? null,
        featuredImage: args.featuredImage ?? null,
        published: args.published ?? true,
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
      date: args.date,
      images: args.images ?? null,
      featuredImage: args.featuredImage ?? null,
      published: args.published ?? true,
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