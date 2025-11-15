import React from "react";
import { BookOpen, Users, Handshake, BrainCircuit, GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import Hero from "@/components/Hero";
import { NewsCard } from "@/components/news-card";
import { PostCard } from "@/components/post-card";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";
import { AdmissionsSteps } from "@/components/AdmissionsSteps";
import { Testimonials } from "@/components/Testimonials";
import { StickyApplyCta } from "@/components/StickyApplyCta";
import { loadBlogJson, loadHome } from "@/lib/content";
import { getNewsPosts } from "@/lib/news";
import type { HomeContent } from "@/lib/types";
import type { Locale } from "@/i18n/config";
import { compilePage } from "@/lib/cms/compile";

const iconMap: Record<string, React.ComponentType<any>> = {
  BookOpen: BookOpen,
  Users: Users,
  Handshake: Handshake,
  University: GraduationCap,
  Brain: BrainCircuit
};

export default async function HomePage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tHome, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Home" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);
  // DB-first: if there's a CMS home page with blocks, render it
  const compiled = await compilePage({ slug: "home", locale, includeDrafts: false, withData: true }).catch(() => null);
  if (compiled && compiled.blocks && compiled.blocks.length > 0) {
    return <>{compiled.element}</>;
  }
  const home = loadHome(locale) as unknown as HomeContent | null;
  const news = (await getNewsPosts(locale)).slice(0, 4);
  const blog = loadBlogJson(locale).slice(0, 4);
  if (!home) {
    return <div className="container-page py-20">{tCommon("missingHome")}</div>;
  }
  return (
    <>
      <div className="p-2">
        <Hero heading={home.hero.title} subheading={home.hero.subtitle} cta={home.hero.cta} image="/images/logo.svg" imageLarge={home.hero.imageLarge} />
      </div>
      <Section title={tHome("newsTitle")}>
        <div className="section-accent">
          {news.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">{tHome("newsEmpty")}</p>}
          {news.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {news.map(n => (
                <Reveal key={n.id}><NewsCard post={n} locale={locale} /></Reveal>
              ))}
            </div>
          )}
        </div>
      </Section>
      <Section title={tHome("blogTitle")}>
        {blog.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">{tHome("blogEmpty")}</p>}
        {blog.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {blog.map(p => (
              <Reveal key={p.id}><PostCard post={p} locale={locale} /></Reveal>
            ))}
          </div>
        )}
      </Section>
      <Section title={tHome("tracksTitle")} description={tHome("tracksDescription")}>
        <div className="section-accent">
          <div className="grid gap-6 md:grid-cols-3">
            {home.tracks.map((t) => (
              <Reveal key={t.key}>
                <div className="group hover-lift flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-subtle transition hover:border-brand-400/70 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                  {t.image && (
                    <div className="relative h-40 w-full overflow-hidden">
                      <img src={t.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent opacity-70 mix-blend-multiply" />
                      <div className="absolute left-2 top-2 inline-flex rounded bg-brand-600/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm dark:bg-brand-500/80">{t.key}</div>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-display">{t.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t.description}</p>
                    <Link
                      href={t.href}
                      className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {tCommon("viewMore")} <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>
      {/* Admissions Steps */}
      {home.admissions?.steps?.length ? (
        <AdmissionsSteps
          title={home.admissions.title}
          description={home.admissions.description}
          steps={home.admissions.steps}
          ctaLabel={home.admissions.cta?.label}
          ctaHref={home.admissions.cta?.href}
        />
      ) : null}
      <Section title={tHome("whyTitle")}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {home.why.map((w, i) => {
            const Icon = iconMap[w.icon] || BookOpen;
            return (
              <div key={i} className="group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-subtle transition hover:border-brand-400/70 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                {w.image && (
                  <img src={w.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-20" />
                )}
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-600/10 ring-1 ring-inset ring-brand-600/20 dark:bg-brand-400/10 dark:ring-brand-400/20">
                  <Icon className="h-5 w-5 text-brand-700 dark:text-brand-400" />
                </div>
                <h3 className="relative text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">{w.title}</h3>
                <p className="relative text-sm text-slate-600 dark:text-slate-400">{w.description}</p>
              </div>
            );
          })}
        </div>
      </Section>
      {/* Testimonials */}
      {home.testimonials?.items?.length ? (
        <Testimonials title={home.testimonials.title} subtitle={home.testimonials.subtitle} items={home.testimonials.items} />
      ) : null}
      <Section title={tHome("numbersTitle")}>
        <div className="grid gap-6 md:grid-cols-4">
          {home.numbers.map((n,i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-subtle dark:border-slate-700 dark:bg-slate-800">
              <p className="text-2xl font-semibold text-brand-700 dark:text-brand-400">{n.value}</p>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">{n.label}</p>
            </div>
          ))}
        </div>
      </Section>
      {/* Mobile Sticky CTA using hero or admissions cta */}
      <StickyApplyCta label={home.admissions?.cta?.label ?? home.hero.cta?.label ?? "Apply Now"} href={home.admissions?.cta?.href ?? home.hero.cta?.href ?? "/priem"} />
    </>
  );
}
