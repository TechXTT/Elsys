import React from "react";
import { getTranslations } from "next-intl/server";

import { Section } from "@/components/Section";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { loadSectionItems } from "@/lib/content";

export default async function StudentLifeIndex({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tNav, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);
  const items = loadSectionItems("uchenicheski-zhivot", locale);
  return (
    <Section title={tNav("studentLife")}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{tCommon("noContent")}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-400" href={item.href}>
                {item.title}
              </Link>
              {item.excerpt && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.excerpt}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}


