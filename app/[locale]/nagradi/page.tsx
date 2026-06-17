import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AwardItem } from "@/components/award-item";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { getAwards, type AwardView } from "@/lib/awards";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Awards" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(params.locale, "/nagradi") };
}

export default async function AwardsPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tAwards, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Awards" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const awards = await getAwards(locale);
  const byYear = new Map<number, AwardView[]>();
  for (const a of awards) {
    if (!byYear.has(a.year)) byYear.set(a.year, []);
    byYear.get(a.year)!.push(a);
  }

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tAwards("title") }]}
      />
      <SectionHeading as="h1" title={tAwards("title")} description={tAwards("intro")} />

      {awards.length === 0 ? (
        <p className="text-body text-ink-muted">{tAwards("empty")}</p>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-2xl)]">
          {Array.from(byYear.entries()).map(([year, items]) => (
            <section key={year} className="flex flex-col gap-[var(--spacing-md)]">
              <h2 className="text-h3 text-ink-heading">{year}</h2>
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <AwardItem key={a.id} title={a.title} description={a.description ?? a.category} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
