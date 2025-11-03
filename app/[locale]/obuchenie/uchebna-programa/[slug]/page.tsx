import React from "react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { loadJson } from "@/lib/content";
import type { PostItem } from "@/lib/types";

export default async function CurriculumDetail({ params }: { params: { locale: Locale; slug: string } }) {
  const locale = params.locale;
  const tCommon = await getTranslations({ locale, namespace: "Common" });
  const items = (loadJson<PostItem[]>("obuchenie/uchebna-programa/index.json", locale) || []).filter(
    (item): item is PostItem => Boolean(item?.id && item?.href),
  );
  const item = items.find((contentItem) => contentItem.href.endsWith(params.slug) || contentItem.id === params.slug);
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


