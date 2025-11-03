import React from "react";
import { BookOpen, Users, Handshake, BrainCircuit, GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/routing";
import Hero from "@/components/Hero";
import { NewsCard } from "@/components/news-card";
import { PostCard } from "@/components/post-card";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";
import { loadNewsJson, loadBlogJson, loadHome } from "@/lib/content";
import type { HomeContent } from "@/lib/types";
import type { Locale } from "@/i18n/config";

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
  const home = loadHome(locale) as unknown as HomeContent | null;
  const news = loadNewsJson(locale).slice(0, 4);
  const blog = loadBlogJson(locale).slice(0, 4);
  if (!home) {
    return <div className="container-page py-20">{tCommon("missingHome")}</div>;
  }
  return (
    <>
      <div className="p-2">
        <Hero heading={home.hero.title} subheading={home.hero.subtitle} cta={home.hero.cta} image="/images/logo.svg" />
      </div>
      <Section title={tHome("newsTitle")}>
        {news.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">{tHome("newsEmpty")}</p>}
        {news.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {news.map(n => (
              <Reveal key={n.id}><NewsCard post={n} locale={locale} /></Reveal>
            ))}
          </div>
        )}
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
        <div className="grid gap-6 md:grid-cols-3">
          {home.tracks.map((t) => (
            <Reveal key={t.key}>
              <div className="hover-lift flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-subtle transition hover:border-brand-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t.description}</p>
                <Link
                  href={t.href}
                  className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {tCommon("viewMore")} <span aria-hidden>→</span>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>
      <Section title={tHome("whyTitle")}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {home.why.map((w, i) => {
            const Icon = iconMap[w.icon] || BookOpen;
            return (
              <div key={i} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-subtle dark:border-slate-700 dark:bg-slate-800">
                <Icon className="h-6 w-6 text-brand-700 dark:text-brand-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">{w.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{w.description}</p>
              </div>
            );
          })}
        </div>
      </Section>
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
    </>
  );
}
