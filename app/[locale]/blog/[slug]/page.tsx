import React from "react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { loadBlogJson } from "@/lib/content";

export default async function BlogDetail({ params }: { params: { locale: Locale; slug: string } }) {
  const locale = params.locale;
  const [tBlog, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Blog" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);
  const all = loadBlogJson(locale);
  const item = all.find((post) => post.href.endsWith(params.slug) || post.id === params.slug);
  if (!item) return <div className="container-page py-20">{tBlog("missing")}</div>;
  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.title}</h1>
      {item.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{item.excerpt}</p>}
      <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tCommon("comingSoon")}</div>
    </div>
  );
}


