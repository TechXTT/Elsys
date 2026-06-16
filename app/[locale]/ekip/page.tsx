import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TeamCard } from "@/components/team-card";
import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { getTeamMembers, type TeamMemberView } from "@/lib/team";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Team" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(params.locale, "/ekip") };
}

export default async function TeamPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tTeam, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Team" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const members = await getTeamMembers(locale);
  const groups = new Map<string, TeamMemberView[]>();
  for (const m of members) {
    const key = m.category?.trim() || tTeam("uncategorized");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tTeam("title") }]}
      />
      <SectionHeading as="h1" title={tTeam("title")} description={tTeam("intro")} />

      {members.length === 0 ? (
        <p className="text-body text-ink-muted">{tTeam("empty")}</p>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-2xl)]">
          {Array.from(groups.entries()).map(([category, items]) => (
            <section key={category} className="flex flex-col gap-[var(--spacing-md)]">
              <h2 className="text-h3 text-ink-heading">{category}</h2>
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-4">
                {items.map((m) => (
                  <TeamCard
                    key={m.id}
                    name={m.name}
                    role={m.role}
                    photo={m.photo}
                    contact={m.email ? { href: `mailto:${m.email}`, label: m.email } : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
