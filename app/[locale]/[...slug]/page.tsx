import React from "react";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import ReactMarkdown from "react-markdown";
// Note: No client-side redirect here; middleware handles alias rewrites.
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { renderBlocks } from "@/lib/cms";
import { getNewsPosts } from "@/lib/news";

export default async function DynamicPage({ params }: { params: { locale: Locale; slug?: string[] } }) {
  const locale = params.locale;
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const slugParts = Array.isArray(params.slug) ? params.slug : [];
  const joined = slugParts.join("/");

  if (!joined) {
    // Let the locale home route handle "/[locale]" specifically; this catch-all is for nested paths.
    
    return <div className="container-page py-20">{tCommon("pageNotFound")}</div>;
  }

  // 1) Try exact full-path match (covers legacy full-path slugs)
  const page = await (prisma as any).page.findUnique({ where: { slug_locale: { slug: joined, locale } } }).catch(() => null);
  if (page && page.published) {
    return (
      <div className="container-page py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{page.title}</h1>
        {page.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{page.excerpt}</p>}
        {Array.isArray(page.blocks)
          ? renderBlocks(page.blocks as any, { locale, news: await getNewsPosts(locale) })
          : null}
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
  console.log("--- [ERROR] No exact match for page:", joined, "in locale:", locale);

  // 2) Hierarchical fallback: resolve by per-segment slugs along the parent chain
  let currentParentId: string | null = null;
  let last: any = null;
  for (const seg of slugParts) {
    const node: any = await (prisma as any).page.findFirst({
      where: { locale, parentId: currentParentId, slug: seg },
      select: { id: true, title: true, excerpt: true, published: true, blocks: true, bodyMarkdown: true },
    });
    console.log("--- [ERROR] No hierarchical match for segment:", seg, "under parent:", currentParentId, "in locale:", locale);
    if (!node) { last = null; break; }
    last = node;
    currentParentId = node.id;
  }
  if (last && last.published) {
    return (
      <div className="container-page py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{last.title}</h1>
        {last.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{last.excerpt}</p>}
        {Array.isArray(last.blocks)
          ? renderBlocks(last.blocks as any, { locale, news: await getNewsPosts(locale) })
          : null}
        {last.bodyMarkdown ? (
          <div className="prose prose-slate mt-6 max-w-none dark:prose-invert">
            <ReactMarkdown>{last.bodyMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tCommon("comingSoon")}</div>
        )}
      </div>
    );
  }

  // 3) Alias rewrite is handled in middleware. If we got here, show not found.

  // Not found by full-path or hierarchical resolution: show 404-like message.
  return <div className="container-page py-20">{tCommon("pageNotFound")}</div>;
}
