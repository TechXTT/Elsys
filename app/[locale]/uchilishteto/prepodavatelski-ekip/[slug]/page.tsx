import React from "react";
import ReactMarkdown from "react-markdown";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { loadJson, loadNewsJson } from "@/lib/content";
import type { PostItem } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { renderBlocks } from "@/lib/cms";

export default async function TeamDetail({ params }: { params: { locale: Locale; slug: string } }) {
  const locale = params.locale;
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  // DB override: if a Page exists for this nested route, render it
  const key = `uchilishteto/prepodavatelski-ekip/${params.slug}`;
  const dbPage = await (prisma as any).page
    .findUnique({ where: { slug_locale: { slug: key, locale } } })
    .catch(() => null);
  if (dbPage && dbPage.published) {
    return (
      <div className="container-page py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{dbPage.title}</h1>
        {dbPage.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{dbPage.excerpt}</p>}
        {/* Render custom blocks if present */}
        {Array.isArray(dbPage.blocks) ? renderBlocks(dbPage.blocks as any, { locale, news: loadNewsJson(locale) }) : null}
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
  const items = (loadJson<PostItem[]>("uchilishteto/prepodavatelski-ekip/index.json", locale) || []).filter(
    (item): item is PostItem => Boolean(item?.id && item?.href),
  );
  const item = items.find((teamItem) => teamItem.href.endsWith(params.slug) || teamItem.id === params.slug);
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


