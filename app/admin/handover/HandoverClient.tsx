"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { completeHandover } from "./actions";

interface Props {
  successors: { id: string; name: string | null; email: string | null; role: string }[];
  allTwoFactor: boolean;
}

export function HandoverClient({ successors, allTwoFactor }: Props) {
  const t = useTranslations("Admin.handover");
  const router = useRouter();
  const [successorId, setSuccessorId] = useState(successors[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [done, setDone] = useState(false);
  const [saving, start] = useTransition();

  function finish() {
    start(async () => {
      await completeHandover(successorId || null, note, summary);
      setDone(true);
      router.refresh();
    });
  }

  return (
    <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <p className="pb-3 text-caption font-semibold uppercase tracking-wide text-ink-muted">{t("receivesAccess")}</p>

      <label className="mb-3 flex flex-col gap-1 text-body-sm">
        <span className="text-ink-heading">{t("successor")}</span>
        <select value={successorId} onChange={(e) => setSuccessorId(e.target.value)} className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:outline-none focus:border-[var(--color-action-primary)]">
          {successors.length === 0 && <option value="">{t("noSuccessor")}</option>}
          {successors.map((s) => <option key={s.id} value={s.id}>{(s.name || s.email) + " · " + s.role}</option>)}
        </select>
      </label>

      <label className="mb-3 flex flex-col gap-1 text-body-sm">
        <span className="text-ink-heading">{t("successorNote")}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t("notePlaceholder")} className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:outline-none focus:border-[var(--color-action-primary)]" />
      </label>

      <label className="mb-3 flex flex-col gap-1 text-body-sm">
        <span className="text-ink-heading">{t("seasonSummary")}</span>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:outline-none focus:border-[var(--color-action-primary)]" />
      </label>

      {!allTwoFactor && (
        <p className="mb-3 rounded-[var(--radius-md)] bg-[var(--color-status-warning-bg)] px-3 py-2 text-caption text-[var(--color-status-warning-text)]">{t("twoFactorWarning")}</p>
      )}

      {done ? (
        <p role="status" className="rounded-[var(--radius-md)] bg-[var(--color-status-success-bg)] px-3 py-2 text-body-sm text-[var(--color-status-success-text)]">{t("completed")}</p>
      ) : (
        <button type="button" onClick={finish} disabled={saving} data-ui="handover-complete" className="w-full rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)] disabled:opacity-50">
          {saving ? t("saving") : t("complete")}
        </button>
      )}
    </aside>
  );
}
