import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { getTranslations } from "next-intl/server";

import { blocksToMarkdown } from "@/app/admin/news/components/blocks/block-serializer";
import { JsonLd } from "@/components/JsonLd";
import { NewsCard } from "@/components/news-card";
import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { locales, type Locale } from "@/i18n/config";
import { getNewsPost, getNewsPosts, getRelatedNews } from "@/lib/news";
import { absoluteUrl, alternatesFor } from "@/lib/site";
import type { PostItem } from "@/lib/types";

export const revalidate = 300; // ISR; unknown slugs render on demand (fallback) then cache.

/** Prebuild every known published slug per locale; new slugs ISR-fallback in. */
export async function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  for (const locale of locales) {
    const posts = await getNewsPosts(locale).catch(() => [] as PostItem[]);
    for (const p of posts) params.push({ locale, slug: p.id });
  }
  return params;
}

function resolveDateLocale(locale: Locale) {
  return locale === "bg" ? "bg-BG" : "en-GB";
}
function formatPublishedDate(locale: Locale, value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(resolveDateLocale(locale), { year: "numeric", month: "long", day: "numeric" }).format(date);
}

// Existing markdown render path (relocated from the legacy /news/[slug]): maps
// image-name references back to their uploaded URLs + display size.
function createMarkdownComponents(images: PostItem["images"] | undefined): Components {
  const imageLookup = new Map((images ?? []).map((img) => [img.name, img.url] as const));
  const sizeLookup = new Map((images ?? []).map((img) => [img.name, img.size ?? "full"] as const));
  const sizeClass = (name?: string) => {
    switch (name && sizeLookup.get(name)) {
      case "small": return "mx-auto w-full max-w-sm";
      case "medium": return "mx-auto w-full max-w-xl";
      case "large": return "mx-auto w-full max-w-4xl";
      default: return "w-full";
    }
  };
  const resolveSrc = (src?: string) => {
    if (!src) return undefined;
    if (/^https?:\/\//i.test(src)) return src;
    const trimmed = src.startsWith("/") ? src.slice(1) : src;
    const key = trimmed.split("/").pop() ?? trimmed;
    return imageLookup.get(key) ?? src;
  };
  return {
    // Demote body headings one level so the page keeps a single <h1> (WCAG /
    // heading hierarchy): markdown # → h2, ## → h3, ### → h4.
    h1: (props: ComponentPropsWithoutRef<"h2">) => <h2 className="text-h3 text-ink-heading" {...props} />,
    h2: (props: ComponentPropsWithoutRef<"h3">) => <h3 className="text-h4 text-ink-heading" {...props} />,
    h3: (props: ComponentPropsWithoutRef<"h4">) => <h4 className="text-h4 text-ink-heading" {...props} />,
    p: (props: ComponentPropsWithoutRef<"p">) => <p className="text-body text-ink" {...props} />,
    ul: (props: ComponentPropsWithoutRef<"ul">) => <ul className="flex list-disc flex-col gap-[var(--spacing-2xs)] pl-[var(--spacing-lg)]" {...props} />,
    ol: (props: ComponentPropsWithoutRef<"ol">) => <ol className="flex list-decimal flex-col gap-[var(--spacing-2xs)] pl-[var(--spacing-lg)]" {...props} />,
    blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
      <blockquote className="border-l-4 border-line-strong pl-[var(--spacing-md)] text-ink-muted italic" {...props} />
    ),
    a: (props: ComponentPropsWithoutRef<"a">) => <a className="text-ink-link underline hover:no-underline" {...props} />,
    img: ({ src, alt, ...props }: ComponentPropsWithoutRef<"img">) => {
      const resolved = resolveSrc(typeof src === "string" ? src : undefined);
      if (!resolved) return null;
      const trimmed = typeof src === "string" ? (src.startsWith("/") ? src.slice(1) : src) : undefined;
      return <img src={resolved} alt={alt ?? ""} className={`my-[var(--spacing-md)] rounded-[var(--radius-md)] ${sizeClass(trimmed?.split("/").pop())}`} {...props} />;
    },
  };
}

export async function generateMetadata({ params }: { params: { locale: Locale; slug: string } }): Promise<Metadata> {
  const data = await getNewsPost(params.slug, params.locale);
  if (!data) return {};
  const { post } = data;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: alternatesFor(params.locale, `/novini/${post.id}`),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      images: post.image ? [{ url: absoluteUrl(post.image) }] : undefined,
    },
  };
}

export default async function NewsArticle({ params }: { params: { locale: Locale; slug: string } }) {
  const locale = params.locale;
  const [tNews, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "News" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const data = await getNewsPost(params.slug, locale);
  if (!data) notFound();
  const { post, markdown, blocks, useBlocks, authorName } = data;

  // Existing render path: the canonical body is bodyMarkdown (the admin writes
  // it via blocksToMarkdown on save). Block-only posts (e.g. seeded with empty
  // bodyMarkdown) fall back to the same serializer, then ReactMarkdown.
  const body =
    markdown && markdown.trim().length > 0
      ? markdown
      : useBlocks && Array.isArray(blocks)
        ? blocksToMarkdown(blocks as never)
        : "";

  const displayDate = formatPublishedDate(locale, post.date);
  const related = await getRelatedNews(post.id, locale, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    image: post.image ? absoluteUrl(post.image) : undefined,
    author: authorName ? { "@type": "Person", name: authorName } : undefined,
    mainEntityOfPage: absoluteUrl(`/${locale}/novini/${post.id}`),
  };

  return (
    <article className="container-page flex flex-col gap-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
      <JsonLd data={jsonLd} />

      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[
          { label: tCommon("home"), href: `/${locale}` },
          { label: tNews("title"), href: `/${locale}/novini` },
          { label: post.title },
        ]}
      />

      <header className="flex flex-col gap-[var(--spacing-sm)]">
        <h1 className="text-h1 text-ink-heading">{post.title}</h1>
        <p className="text-body-sm text-ink-muted">
          {displayDate && <span>{tNews("publishedOn", { date: displayDate })}</span>}
          {displayDate && authorName && <span aria-hidden> · </span>}
          {authorName && <span>{tNews("by", { author: authorName })}</span>}
        </p>
      </header>

      {post.image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-lg)] bg-subtle">
          <Image fill src={post.image} alt="" sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" priority />
        </div>
      )}

      <div className="max-w-3xl">
        {body ? (
          <div className="flex flex-col gap-[var(--spacing-md)]">
            <ReactMarkdown components={createMarkdownComponents(post.images)}>{body}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-body text-ink-muted">{tCommon("comingSoon")}</p>
        )}
      </div>

      {related.length > 0 && (
        <section className="flex flex-col gap-[var(--spacing-lg)] border-t border-line pt-[var(--spacing-xl)]">
          <SectionHeading as="h2" title={tNews("relatedTitle")} highlight={tNews("relatedAccent")} />
          <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
            {related.map((n) => (
              <NewsCard key={n.id} post={n} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
