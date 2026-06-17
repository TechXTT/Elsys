import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PartnerLogo } from "@/components/partner-logo";
import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { getPartners } from "@/lib/partners";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Partners" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(params.locale, "/partnyori") };
}

export default async function PartnersPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tPartners, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Partners" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const partners = await getPartners(locale);

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tPartners("title") }]}
      />
      <SectionHeading as="h1" title={tPartners("title")} description={tPartners("intro")} />

      {partners.length === 0 ? (
        <p className="text-body text-ink-muted">{tPartners("empty")}</p>
      ) : (
        <div className="grid items-center gap-[var(--spacing-lg)] sm:grid-cols-3 lg:grid-cols-4">
          {partners.map((p) => (
            <PartnerLogo key={p.id} name={p.name} logo={p.logo} href={p.url} grayscale />
          ))}
        </div>
      )}
    </div>
  );
}
