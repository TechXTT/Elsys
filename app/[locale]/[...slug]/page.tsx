import React from "react";
import type { Metadata } from "next";
// Disable force-dynamic to enable ISR caching
export const revalidate = 300; // 5-minute ISR (revalidate on-demand from admin API)
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { getTranslations } from "next-intl/server";

import { defaultLocale, type Locale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { renderBlocks } from "@/lib/cms";
import { getNewsPosts } from "@/lib/news";
import { resolveAlias } from "@/lib/routes";
import { isPublic } from "@/lib/content/shared";
import { alternatesFor } from "@/lib/site";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { PostItem } from "@/lib/types";

// Render a resolved Page: one <h1> (the page title) in a container, then its
// blocks full-width (each block owns its layout), or a tokenised markdown body.
function PageContent({
  page,
  locale,
  news,
  comingSoon,
  homeLabel,
  breadcrumbLabel,
  untranslatedNote,
}: {
  page: any;
  locale: Locale;
  news?: PostItem[];
  comingSoon: string;
  homeLabel: string;
  breadcrumbLabel: string;
  untranslatedNote?: string;
}) {
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  // Content language for screen readers: a bg-fallback rendered under /en must
  // announce lang="bg"; real (DeepL) EN announces lang="en" (J item 5).
  return (
    <div lang={untranslatedNote ? defaultLocale : locale}>
      {untranslatedNote && (
        <div className="container-page pt-[var(--spacing-lg)]">
          <p role="status" className="text-body-sm rounded-[var(--radius-md)] bg-brand-tint px-[var(--spacing-md)] py-[var(--spacing-sm)] text-ink">
            {untranslatedNote}
          </p>
        </div>
      )}
      <div className="container-page flex flex-col gap-[var(--spacing-md)] pt-[var(--spacing-2xl)]">
        <Breadcrumbs label={breadcrumbLabel} items={[{ label: homeLabel, href: `/${locale}` }, { label: page.title }]} />
        <div>
          <h1 className="text-h1 text-ink-heading">{page.title}</h1>
          {page.excerpt && <p className="text-body-lg mt-[var(--spacing-sm)] text-ink-muted">{page.excerpt}</p>}
        </div>
      </div>
      {blocks.length > 0 ? (
        renderBlocks(blocks as any, { locale, news })
      ) : page.bodyMarkdown ? (
        <div className="container-page py-[var(--spacing-2xl)] text-body flex flex-col gap-[var(--spacing-md)] text-ink [&_a]:text-ink-link [&_a]:underline [&_h2]:text-h3 [&_h2]:text-ink-heading [&_h3]:text-h4 [&_h3]:text-ink-heading [&_ol]:list-decimal [&_ol]:pl-[var(--spacing-lg)] [&_ul]:list-disc [&_ul]:pl-[var(--spacing-lg)]">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{page.bodyMarkdown}</ReactMarkdown>
        </div>
      ) : (
        <div className="container-page py-[var(--spacing-2xl)] text-body text-ink-muted">{comingSoon}</div>
      )}
    </div>
  );
}

/**
 * Resolve page by checking hierarchical path with batch query (avoid N+1).
 * Returns { page, foundAt: "exact" | "hierarchical" | null }
 */
async function resolvePageHierarchical(
  locale: Locale,
  slugParts: string[]
): Promise<{ page: any; foundAt: "exact" | "hierarchical" } | null> {
  if (slugParts.length === 0) return null;

  const joined = slugParts.join("/");

  // 1) Try exact full-path match
  const page = await (prisma as any).page.findUnique({
    where: { slug_locale: { slug: joined, locale } },
    select: { id: true, title: true, excerpt: true, published: true, status: true, blocks: true, bodyMarkdown: true },
  }).catch(() => null);

  if (page && isPublic(page)) return { page, foundAt: "exact" };

  // 2) Hierarchical fallback: batch fetch all needed paths at once (avoids N+1)
  // Build all parent-segment combinations to check
  const pathsToCheck: Array<{ parentId: string | null; slug: string; depth: number }> = [];
  let currentParentId: string | null = null;
  for (let i = 0; i < slugParts.length; i++) {
    pathsToCheck.push({ parentId: currentParentId, slug: slugParts[i], depth: i });
  }

  // Batch fetch: get all nodes at each level
  const allNodes: any[] = await (prisma as any).page.findMany({
    where: {
      locale,
      slug: { in: slugParts },
      // This is still a limitation, but we can optimize by fetching strategically
    },
    select: { id: true, parentId: true, slug: true, title: true, excerpt: true, published: true, status: true, blocks: true, bodyMarkdown: true },
  });

  // Build a map for quick lookup
  const byParentAndSlug = new Map<string, any>();
  allNodes.forEach((n) => {
    const key = `${n.parentId ?? "ROOT"}:${n.slug}`;
    byParentAndSlug.set(key, n);
  });

  // Traverse the path
  let current: any = null;
  currentParentId = null;
  for (const seg of slugParts) {
    const key = `${currentParentId ?? "ROOT"}:${seg}`;
    current = byParentAndSlug.get(key);
    if (!current) break;
    currentParentId = current.id;
  }

  if (current && isPublic(current)) return { page: current, foundAt: "hierarchical" };
  return null;
}

// Canonical + hreflang for every resolved dynamic page (legal pages, content
// pages, etc.). Title/description come from the resolved Page; the alternates
// always cover every locale so bg-only pages still advertise their /en URL
// (served via the in-page locale fallback).
export async function generateMetadata({ params }: { params: { locale: Locale; slug?: string[] } }): Promise<Metadata> {
  const slugParts = Array.isArray(params.slug) ? params.slug : [];
  if (!slugParts.length) return {};
  const joined = slugParts.join("/");

  const lookup = async (loc: Locale) =>
    (prisma as any).page
      .findUnique({
        where: { slug_locale: { slug: joined, locale: loc } },
        select: { title: true, excerpt: true, published: true, status: true },
      })
      .catch(() => null);

  let page = await lookup(params.locale);
  if ((!page || !isPublic(page)) && params.locale !== defaultLocale) {
    page = await lookup(defaultLocale);
  }
  if (!page || !isPublic(page)) return { alternates: alternatesFor(params.locale, `/${joined}`) };

  return {
    title: page.title,
    description: page.excerpt || undefined,
    alternates: alternatesFor(params.locale, `/${joined}`),
  };
}

export default async function DynamicPage({ params }: { params: { locale: Locale; slug?: string[] } }) {
  const locale = params.locale;
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const slugParts = Array.isArray(params.slug) ? params.slug : [];

  if (!slugParts.length) notFound();

  // Resolve for the requested locale (exact → hierarchical → route alias).
  const resolveFor = async (loc: Locale) => {
    let r = await resolvePageHierarchical(loc, slugParts);
    if (!r) {
      const aliasTarget = await resolveAlias(loc, slugParts);
      if (aliasTarget) r = await resolvePageHierarchical(loc, aliasTarget);
    }
    return r;
  };

  let resolved = await resolveFor(locale);

  // Locale fallback: render the bg version when the requested locale has no
  // content (mirrors the news fallback). Flagged untranslated. TODO(DeepL pass).
  let untranslated = false;
  if (!resolved && locale !== defaultLocale) {
    resolved = await resolveFor(defaultLocale);
    if (resolved) untranslated = true;
  }

  if (!resolved) notFound();

  const { page } = resolved;

  // Only fetch news if a block actually needs it.
  const hasNewsBlock = Array.isArray(page.blocks) && page.blocks.some((b: any) => b?.type === "NewsList");
  const news = hasNewsBlock ? await getNewsPosts(locale) : undefined;

  return (
    <PageContent
      page={page}
      locale={locale}
      news={news}
      comingSoon={tCommon("comingSoon")}
      homeLabel={tCommon("home")}
      breadcrumbLabel={tCommon("breadcrumb")}
      untranslatedNote={untranslated ? tCommon("untranslated") : undefined}
    />
  );
}
