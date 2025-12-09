import React from "react";
// Disable force-dynamic to enable ISR caching
export const revalidate = 300; // 5-minute ISR (revalidate on-demand from admin API)
import ReactMarkdown from "react-markdown";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { renderBlocks } from "@/lib/cms";
import { getNewsPosts } from "@/lib/news";

// Render the page content (extracted to avoid duplication)
function PageContent({
  page,
  locale,
  tCommon,
  hasNews,
}: {
  page: any;
  locale: Locale;
  tCommon: any;
  hasNews: boolean;
}) {
  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{page.title}</h1>
      {page.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{page.excerpt}</p>}
      {hasNews && Array.isArray(page.blocks) ? (
        <React.Suspense fallback={<div className="mt-6 text-sm text-slate-400">Loading...</div>}>
          {renderBlocks(page.blocks as any, { locale, news: undefined as any })}
        </React.Suspense>
      ) : Array.isArray(page.blocks) ? (
        renderBlocks(page.blocks as any, { locale, news: undefined as any })
      ) : null}
      {page.bodyMarkdown ? (
        <div className="prose prose-slate mt-6 max-w-none dark:prose-invert">
          <ReactMarkdown>{page.bodyMarkdown}</ReactMarkdown>
        </div>
      ) : (
        <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tCommon("comingSoon")}</div>
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
    select: { id: true, title: true, excerpt: true, published: true, blocks: true, bodyMarkdown: true },
  }).catch(() => null);

  if (page?.published) return { page, foundAt: "exact" };

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
    select: { id: true, parentId: true, slug: true, title: true, excerpt: true, published: true, blocks: true, bodyMarkdown: true },
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

  if (current?.published) return { page: current, foundAt: "hierarchical" };
  return null;
}

export default async function DynamicPage({ params }: { params: { locale: Locale; slug?: string[] } }) {
  const locale = params.locale;
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const slugParts = Array.isArray(params.slug) ? params.slug : [];

  if (!slugParts.length) {
    return <div className="container-page py-20">{tCommon("pageNotFound")}</div>;
  }

  // Resolve the page (exact or hierarchical)
  const resolved = await resolvePageHierarchical(locale, slugParts);
  if (!resolved) {
    return <div className="container-page py-20">{tCommon("pageNotFound")}</div>;
  }

  const { page } = resolved;

  // Check if page uses news blocks (avoid fetching news if not needed)
  const hasNewsBlock = Array.isArray(page.blocks) && page.blocks.some((b: any) => b.type === "NewsList");

  // Only fetch news if the page actually uses it
  if (hasNewsBlock) {
    const news = await getNewsPosts(locale);
    return (
      <div className="container-page py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{page.title}</h1>
        {page.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{page.excerpt}</p>}
        {Array.isArray(page.blocks) ? renderBlocks(page.blocks as any, { locale, news }) : null}
        {page.bodyMarkdown ? (
          <div className="prose prose-slate mt-6 max-w-none dark:prose-invert">
            <ReactMarkdown>{page.bodyMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tCommon("comingSoon")}</div>
        )}
      </div>
    );
  }

  return <PageContent page={page} locale={locale} tCommon={tCommon} hasNews={false} />;
}
