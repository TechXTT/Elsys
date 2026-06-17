import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LeaderCard } from "@/components/leader-card";
import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { getLeaders, type LeaderView } from "@/lib/leaders";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Leaders" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(params.locale, "/vipuski") };
}

export default async function LeadersPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tLeaders, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Leaders" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const leaders = await getLeaders(locale);
  const byYear = new Map<number, LeaderView[]>();
  for (const l of leaders) {
    if (!byYear.has(l.year)) byYear.set(l.year, []);
    byYear.get(l.year)!.push(l);
  }

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tLeaders("title") }]}
      />
      <SectionHeading as="h1" title={tLeaders("title")} description={tLeaders("intro")} />

      {leaders.length === 0 ? (
        <p className="text-body text-ink-muted">{tLeaders("empty")}</p>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-2xl)]">
          {Array.from(byYear.entries()).map(([year, items]) => (
            <section key={year} className="flex flex-col gap-[var(--spacing-md)]">
              <h2 className="text-h3 text-ink-heading">{tLeaders("classOf", { year })}</h2>
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-4">
                {items.map((l) => (
                  <LeaderCard key={l.id} name={l.name} year={l.year} role={l.role} photo={l.image} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
