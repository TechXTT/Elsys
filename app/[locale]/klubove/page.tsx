import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ClubCard } from "@/components/club-card";
import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { getClubs } from "@/lib/clubs";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Clubs" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor(params.locale, "/klubove") };
}

export default async function ClubsPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tClubs, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Clubs" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const clubs = await getClubs(locale);

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tClubs("title") }]}
      />
      <SectionHeading as="h1" title={tClubs("title")} description={tClubs("description")} />

      {clubs.length === 0 ? (
        <p className="text-body text-ink-muted">{tClubs("empty")}</p>
      ) : (
        <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <ClubCard
              key={c.id}
              name={c.title}
              description={c.description}
              color={c.color}
              logo={c.coverImage}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
