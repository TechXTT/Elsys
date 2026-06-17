import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { JsonLd } from "@/components/JsonLd";
import Hero from "@/components/Hero";
import type { Locale } from "@/i18n/config";
import { compilePage } from "@/lib/cms/compile";
import { getLatestNews } from "@/lib/news";
import { absoluteUrl, alternatesFor } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Home" });
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: alternatesFor(params.locale, "/") };
}

// M1.3 R5: the homepage is one DB-driven source of truth — a CMS "home" Page
// composed of blocks (seeded). No static home.json fallback. JSON-LD is emitted
// here (it's metadata, not content).
export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const tHome = await getTranslations({ locale, namespace: "Home" });

  const [compiled, latest] = await Promise.all([
    compilePage({ slug: "home", locale, includeDrafts: false, withData: true }).catch(() => null),
    getLatestNews(locale, 3),
  ]);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "ТУЕС — Технологично училище „Електронни системи“",
    url: absoluteUrl(`/${locale}`),
    logo: absoluteUrl("/images/logo.svg"),
  };
  const newsJsonLd = latest.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: latest.map((n, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/${locale}${n.href}`), name: n.title })),
      }
    : null;

  return (
    <>
      <JsonLd data={orgJsonLd} />
      {newsJsonLd && <JsonLd data={newsJsonLd} />}
      {compiled && compiled.blocks.length > 0 ? (
        compiled.element
      ) : (
        // Minimal fallback only if the CMS "home" page is missing (no static JSON).
        <div className="container-page py-[var(--spacing-2xl)]">
          <Hero heading={tHome("metaTitle")} subheading={tHome("metaDescription")} />
        </div>
      )}
    </>
  );
}
