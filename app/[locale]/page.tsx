import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ColorTag } from "@prisma/client";

import { CarouselHero } from "@/components/CarouselHero";
import { ClubCard } from "@/components/club-card";
import Hero from "@/components/Hero";
import { JsonLd } from "@/components/JsonLd";
import { NewsCard } from "@/components/news-card";
import { NumberStat } from "@/components/number-stat";
import { SectionHeading } from "@/components/Section";
import { TestimonialQuote } from "@/components/testimonial-quote";
import { ButtonLink } from "@/components/ui/Button";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { compilePage } from "@/lib/cms/compile";
import { loadHome } from "@/lib/content";
import { getCarouselSlides } from "@/lib/carousel";
import { getLatestNews } from "@/lib/news";
import { absoluteUrl, alternatesFor } from "@/lib/site";
import type { HomeContent } from "@/lib/types";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Home" });
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: alternatesFor(params.locale, "/") };
}

// TODO(F): source clubs preview from the Club model / CMS instead of static data.
const CLUBS_PREVIEW: Array<{ name: string; description: string; color: ColorTag }> = [
  { name: "Роботика", description: "Клуб по състезателна робототехника и автоматизация.", color: "GREEN" },
  { name: "Състезателно програмиране", description: "Алгоритми, структури от данни и олимпиади.", color: "BLUE" },
  { name: "Фотография", description: "Заснемане и обработка на училищния живот.", color: "PURPLE" },
];

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tHome, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Home" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  // DB-first: an admin-built CMS "home" page with blocks still wins.
  const compiled = await compilePage({ slug: "home", locale, includeDrafts: false, withData: true }).catch(() => null);
  if (compiled && compiled.blocks && compiled.blocks.length > 0) {
    return <>{compiled.element}</>;
  }

  const [slides, latest] = await Promise.all([getCarouselSlides(locale), getLatestNews(locale, 3)]);
  const home = loadHome(locale) as unknown as HomeContent | null;

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
        itemListElement: latest.map((n, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: absoluteUrl(`/${locale}${n.href}`),
          name: n.title,
        })),
      }
    : null;

  return (
    <>
      <JsonLd data={orgJsonLd} />
      {newsJsonLd && <JsonLd data={newsJsonLd} />}

      {slides.length > 0 ? (
        <CarouselHero slides={slides} />
      ) : home?.hero ? (
        <div className="container-page py-[var(--spacing-xl)]">
          <Hero
            heading={home.hero.title}
            subheading={home.hero.subtitle}
            cta={home.hero.cta}
            imageLarge={home.hero.imageLarge}
          />
        </div>
      ) : null}

      <div className="container-page flex flex-col gap-[var(--spacing-4xl)] py-[var(--spacing-2xl)]">
        {/* Latest news — REAL data: getLatestNews → getNewsPosts (cached, explicit select). */}
        <section aria-labelledby="home-news" className="flex flex-col gap-[var(--spacing-xl)]">
          <div className="flex flex-wrap items-end justify-between gap-[var(--spacing-md)]">
            <SectionHeading as="h2" title={tHome("latestNews")} highlight={tHome("latestNewsAccent")} />
            <ButtonLink variant="secondary" size="md" href="/novini">
              {tHome("allNews")}
            </ButtonLink>
          </div>
          <span id="home-news" className="sr-only" />
          {latest.length === 0 ? (
            <p className="text-body text-ink-muted">{tHome("newsEmpty")}</p>
          ) : (
            <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((n) => (
                <NewsCard key={n.id} post={n} locale={locale} category={n.colorTag} categoryLabel={n.category} />
              ))}
            </div>
          )}
        </section>

        {/* TODO(F): source stats from CMS. Static seeded content for now. */}
        {home?.numbers?.length ? (
          <section aria-label={tHome("numbersTitle")} className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-4">
            {home.numbers.slice(0, 4).map((n, i) => (
              <NumberStat key={i} value={n.value} label={n.label} accent={i % 2 === 0 ? "brand" : "coral"} />
            ))}
          </section>
        ) : null}

        {/* TODO(F): source specialties from CMS. Static seeded content for now. */}
        {home?.tracks?.length ? (
          <section className="flex flex-col gap-[var(--spacing-xl)]">
            <SectionHeading as="h2" title={tHome("specialtiesTitle")} highlight={tHome("specialtiesAccent")} description={tHome("tracksDescription")} />
            <div className="grid gap-[var(--spacing-lg)] md:grid-cols-3">
              {home.tracks.map((track) => (
                <div key={track.key} className="flex h-full flex-col gap-[var(--spacing-xs)] rounded-[var(--radius-lg)] border border-line bg-surface p-[var(--spacing-lg)]">
                  <h3 className="text-h4 text-ink-heading">{track.title}</h3>
                  <p className="text-body text-ink-muted">{track.description}</p>
                  <Link href={track.href} className="text-body-sm mt-auto pt-[var(--spacing-xs)] font-semibold text-ink-link no-underline hover:underline">
                    {tCommon("viewMore")} <span aria-hidden>→</span>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* TODO(F): source clubs preview from the Club model / CMS. */}
        <section className="flex flex-col gap-[var(--spacing-xl)]">
          <SectionHeading as="h2" title={tHome("clubsTitle")} highlight={tHome("clubsAccent")} />
          <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
            {CLUBS_PREVIEW.map((c) => (
              <ClubCard key={c.name} name={c.name} description={c.description} color={c.color} />
            ))}
          </div>
        </section>

        {/* TODO(F): source testimonials from CMS. Static seeded content for now. */}
        {home?.testimonials?.items?.length ? (
          <section className="flex flex-col gap-[var(--spacing-xl)]">
            <SectionHeading as="h2" title={tHome("testimonialsTitle")} highlight={tHome("testimonialsAccent")} />
            <div className="grid gap-[var(--spacing-lg)] md:grid-cols-3">
              {home.testimonials.items.slice(0, 3).map((item, i) => (
                <TestimonialQuote key={i} quote={item.quote} name={item.name} meta={item.role} photo={item.image} />
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA band */}
        <section className="flex flex-col items-center gap-[var(--spacing-md)] rounded-[var(--radius-lg)] bg-brand-tint px-[var(--spacing-lg)] py-[var(--spacing-2xl)] text-center">
          <SectionHeading as="h2" align="center" title={tHome("ctaTitle")} highlight={tHome("ctaAccent")} />
          <p className="text-body-lg max-w-2xl text-ink-muted">{tHome("ctaText")}</p>
          <ButtonLink variant="primary" size="lg" href="/priem">
            {tHome("ctaButton")}
          </ButtonLink>
        </section>
      </div>
    </>
  );
}

export const revalidate = 300;
