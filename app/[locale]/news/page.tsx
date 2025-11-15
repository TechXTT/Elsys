import React from "react";
import { getTranslations } from "next-intl/server";

import { NewsCard } from "@/components/news-card";
import { Section } from "@/components/Section";
import type { Locale } from "@/i18n/config";
import { getNewsPosts } from "@/lib/news";

export default async function NewsIndex({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "News" });
  const news = await getNewsPosts(locale);
  return (
    <Section title={t("title")}> 
      {news.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("empty")}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((n) => (
            <NewsCard key={n.id} post={n} locale={locale} />
          ))}
        </div>
      )}
    </Section>
  );
}
