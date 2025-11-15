import React from "react";
import ReactMarkdown from "react-markdown";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { loadSectionItems } from "@/lib/content";
import { getNewsPosts } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { renderBlocks } from "@/lib/cms";

export default async function ObuchenieDetail({ params }: { params: { locale: Locale; slug: string } }) {
  const locale = params.locale;
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  // DB override: try full-path slug, then fall back to leaf slug for this locale
  const key = `obuchenie/${params.slug}`;
  let dbPage: any = await (prisma as any).page
    .findUnique({ where: { slug_locale: { slug: key, locale } } })
    .catch(() => null);
  if (!dbPage) {
    dbPage = await (prisma as any).page.findFirst({ where: { locale, slug: params.slug } }).catch(() => null);
  }
  if (dbPage && dbPage.published) {
    return (
      <div className="container-page py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{dbPage.title}</h1>
        {dbPage.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{dbPage.excerpt}</p>}
        {/* Render custom blocks if present */}
        {Array.isArray(dbPage.blocks) ? renderBlocks(dbPage.blocks as any, { locale, news: await getNewsPosts(locale) }) : null}
        {dbPage.bodyMarkdown ? (
          <div className="prose prose-slate mt-6 max-w-none dark:prose-invert">
            <ReactMarkdown>{dbPage.bodyMarkdown}</ReactMarkdown>
          </div>
        ) : (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tCommon("comingSoon")}</div>
        )}
      </div>
    );
  }
  const items = loadSectionItems("obuchenie", locale);
  const item = items.find((section) => section.href.endsWith(params.slug) || section.id === params.slug);
  if (!item) return <div className="container-page py-20">{tCommon("pageNotFound")}</div>;
  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.title}</h1>
      {item.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{item.excerpt}</p>}
      {item.body ? (
        <article className="prose prose-slate mt-6 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: item.body }} />
      ) : (
        <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tCommon("comingSoon")}</div>
      )}
    </div>
  );
}


