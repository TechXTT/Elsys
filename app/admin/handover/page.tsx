import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { currentRole } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getHandoverState } from "@/lib/handover";
import { HandoverClient } from "./HandoverClient";

export const dynamic = "force-dynamic";

export default async function HandoverPage() {
  const role = await currentRole();
  if (!role) redirect("/admin/login");
  if (!can(role, "roles:manage")) redirect("/admin"); // ADMIN-only

  const t = await getTranslations("Admin.handover");
  const state = await getHandoverState();
  const firstPending = state.steps.findIndex((s) => !s.done);

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("progress", { season: state.season, done: state.doneCount, total: state.steps.length })}
        breadcrumbs={[{ label: t("title") }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ol className="flex flex-col gap-3">
          {state.steps.map((s, i) => (
            <li key={s.key} className="flex items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-semibold ${
                  s.done ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]"
                  : i === firstPending ? "bg-[var(--color-action-primary)] text-[var(--color-text-on-action)]"
                  : "border border-line text-ink-muted"
                }`}>
                  {s.done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <div>
                  <p className="text-body font-medium text-ink-heading">{t(`steps.${s.key}.title`)}</p>
                  <p className="text-body-sm text-ink-muted">{t(`steps.${s.key}.desc`, { count: s.count ?? 0 })}</p>
                </div>
              </div>
              <span className="shrink-0">
                {s.done ? (
                  <span className="text-body-sm text-ink-muted">{t("done")}</span>
                ) : s.href ? (
                  <Link href={s.href as never} className="text-body-sm font-medium text-[var(--color-action-primary)] hover:underline">
                    {i === firstPending ? t("continue") : t("start")}
                  </Link>
                ) : null}
              </span>
            </li>
          ))}
        </ol>

        <HandoverClient successors={state.successors} allTwoFactor={state.allTwoFactor} />
      </div>
    </div>
  );
}
