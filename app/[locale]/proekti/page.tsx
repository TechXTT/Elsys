import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { isRemoteSrc } from "@/lib/image";
import { getProjects } from "@/lib/projects";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Projects" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor(params.locale, "/proekti") };
}

// NOTE: dedicated ProjectCard is design-pending (gap backlog). Built functional
// on design-system tokens — no net-new visual language.
export default async function ProjectsPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tProjects, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Projects" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const projects = await getProjects(locale);

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tProjects("title") }]}
      />
      <SectionHeading as="h1" title={tProjects("title")} description={tProjects("description")} />

      {projects.length === 0 ? (
        <p className="text-body text-ink-muted">{tProjects("empty")}</p>
      ) : (
        <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <article key={p.id} className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              {p.image && (
                <div className="relative aspect-[3/2] w-full bg-subtle">
                  <Image fill src={p.image} alt="" className="object-cover" sizes="(min-width: 1024px) 360px, 100vw" unoptimized={isRemoteSrc(p.image)} />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-[var(--spacing-sm)] p-[var(--spacing-lg)]">
                {p.category && <span className="text-caption uppercase tracking-wide text-ink-muted">{p.category}</span>}
                <h2 className="text-h4 text-ink-heading">{p.title}</h2>
                {p.description && <p className="text-body-sm text-ink-muted">{p.description}</p>}
                {p.url && (
                  <ButtonLink href={p.url} external variant="ghost" size="sm" className="mt-auto self-start !px-0">
                    {tProjects("visit")} →
                  </ButtonLink>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
