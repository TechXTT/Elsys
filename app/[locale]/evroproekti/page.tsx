import React from "react";
import { getTranslations } from "next-intl/server";

import { Section } from "@/components/Section";
import type { Locale } from "@/i18n/config";

export default async function EvroproektiPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tNav, tCommon, tProjects] = await Promise.all([
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Common" }),
    getTranslations({ locale, namespace: "Projects" }),
  ]);
  return (
    <Section title={tNav("projects")} description={tProjects("description")}>
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400">{tCommon("comingSoon")}</p>
      </div>
    </Section>
  );
}


