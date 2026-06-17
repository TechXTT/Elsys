import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { GraduationCap, ArrowRight } from "lucide-react";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { listHelpArticles } from "@/lib/help";

export const dynamic = "force-dynamic";

export default async function HelpCenterPage() {
  const t = await getTranslations("Admin.help");
  const articles = await listHelpArticles();

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} breadcrumbs={[{ label: t("title") }]} />

      {/* Onboarding tour launcher (coachmarks are a follow-up; launcher + articles ship now). */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-line bg-[var(--color-action-primary)]/5 p-5">
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 h-6 w-6 text-[var(--color-action-primary)]" aria-hidden />
          <div>
            <p className="text-h4 text-ink-heading">{t("tourTitle")}</p>
            <p className="text-body-sm text-ink-muted">{t("tourSubtitle")}</p>
          </div>
        </div>
        <Link href="/admin/help/publish-a-news" className="rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)]">
          {t("tourStart")}
        </Link>
      </div>

      <h2 className="mb-4 text-h3 text-ink-heading">{t("runbooks")}</h2>
      {articles.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {articles.map((a) => (
            <Link key={a.id} href={`/admin/help/${a.slug}`} className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-line bg-surface p-5 no-underline transition hover:border-line-strong">
              <h3 className="text-h4 text-ink-heading">{a.title}</h3>
              {a.summary && <p className="text-body-sm text-ink-muted">{a.summary}</p>}
              <span className="mt-auto inline-flex items-center gap-1 text-body-sm font-medium text-[var(--color-action-primary)]">
                {t("open")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
