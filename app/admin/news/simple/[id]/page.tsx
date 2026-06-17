import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getNewsCategoryPages } from "@/lib/news";
import { SimpleEditor, type SimpleNewsRecord } from "../SimpleEditor";

export const dynamic = "force-dynamic";

export default async function EditSimpleNewsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { locale?: Locale };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const locale = (searchParams?.locale === "en" ? "en" : defaultLocale) as Locale;

  const [row, categoryPages] = await Promise.all([
    prisma.newsPost.findUnique({
      where: { id_locale: { id: params.id, locale } },
      select: {
        id: true, title: true, excerpt: true, bodyMarkdown: true, date: true,
        featuredImage: true, images: true, colorTag: true, categoryPageId: true, published: true,
        metaTitle: true, metaDescription: true, ogImage: true, noindex: true, canonical: true,
      },
    }),
    getNewsCategoryPages(locale),
  ]);
  if (!row) notFound();

  const gallery = Array.isArray(row.images)
    ? (row.images as { url?: string }[]).map((i) => i?.url).filter((u): u is string => !!u)
    : [];

  const record: SimpleNewsRecord = {
    slug: row.id,
    title: row.title,
    excerpt: row.excerpt ?? undefined,
    markdown: row.bodyMarkdown ?? "",
    date: row.date ? new Date(row.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    featuredImage: row.featuredImage ?? undefined,
    gallery,
    colorTag: row.colorTag ?? undefined,
    categoryPageId: row.categoryPageId ?? undefined,
    published: row.published,
    metaTitle: row.metaTitle ?? undefined,
    metaDescription: row.metaDescription ?? undefined,
    ogImage: row.ogImage ?? undefined,
    noindex: row.noindex,
    canonical: row.canonical ?? undefined,
  };

  return <SimpleEditor locale={locale} categoryPages={categoryPages} record={record} />;
}
