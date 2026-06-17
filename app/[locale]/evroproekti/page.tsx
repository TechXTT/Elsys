import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProjectCard } from "@/components/project-card";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { getProjects } from "@/lib/projects";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Projects" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor(params.locale, "/evroproekti") };
}

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
            <ProjectCard
              key={p.id}
              title={p.title}
              description={p.description}
              image={p.image}
              category={p.category}
              href={p.url}
              external={!!p.url}
            />
          ))}
        </div>
      )}
    </div>
  );
}
