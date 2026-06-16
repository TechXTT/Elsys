"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ColorTag } from "@prisma/client";
import { Badge as UiBadge, colorTagToBadge, type BadgeColor } from "@/components/ui/Badge";
import type { ClientContentTypeConfig, ContentRecord } from "@/lib/content/shared";
import { bulkSetStatus, bulkDeleteRecords } from "../actions";

const STATUS_BADGE: Record<string, { color: BadgeColor; key: string }> = {
  PUBLISHED: { color: "green", key: "PUBLISHED" },
  DRAFT: { color: "amber", key: "DRAFT" },
  PREVIEW: { color: "teal", key: "PREVIEW" },
  SCHEDULED: { color: "purple", key: "SCHEDULED" },
  ARCHIVED: { color: "blue", key: "ARCHIVED" },
};

interface Props {
  config: ClientContentTypeConfig;
  records: ContentRecord[];
}

export function ContentListClient({ config, records }: Props) {
  const t = useTranslations("Admin.contentList");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, startTransition] = useTransition();

  const titleField = config.titleField ?? "title";
  const statusField = config.statusField ?? "status";
  const colorField = config.colorField;
  const enableBulk = config.enableBulk !== false;

  const allSelected = records.length > 0 && selected.size === records.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(records.map((r) => r.id)));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clear() { setSelected(new Set()); }

  function runBulk(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      clear();
      router.refresh();
    });
  }

  const ids = () => Array.from(selected);

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
      {/* Bulk action bar */}
      {enableBulk && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-[var(--color-bg-subtle)] px-4 py-2 text-body-sm">
          <span className="font-medium text-ink-heading">{t("selectedCount", { count: selected.size })}</span>
          <button type="button" disabled={busy} onClick={() => runBulk(() => bulkSetStatus(config.type, ids(), "PUBLISHED"))} className="text-[var(--color-action-primary)] hover:underline disabled:opacity-50">{t("publish")}</button>
          <button type="button" disabled={busy} onClick={() => runBulk(() => bulkSetStatus(config.type, ids(), "ARCHIVED"))} className="text-[var(--color-action-primary)] hover:underline disabled:opacity-50">{t("archive")}</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => { if (window.confirm(t("deleteConfirm", { count: selected.size }))) runBulk(() => bulkDeleteRecords(config.type, ids())); }}
            className="text-[var(--color-status-danger-text)] hover:underline disabled:opacity-50"
          >{t("delete")}</button>
          <button type="button" onClick={clear} className="ml-auto text-ink-muted hover:underline">{t("clear")}</button>
        </div>
      )}

      <table className="w-full text-left text-body-sm">
        <thead>
          <tr className="border-b border-line text-caption uppercase tracking-wide text-ink-muted">
            {enableBulk && (
              <th className="w-10 px-4 py-3">
                <input type="checkbox" aria-label={t("selectAll")} checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-line" />
              </th>
            )}
            <th className="px-4 py-3">{t("colTitle")}</th>
            {colorField && <th className="px-4 py-3">{t("colColor")}</th>}
            {<th className="px-4 py-3">{t("colStatus")}</th>}
            <th className="px-4 py-3">{t("colUpdated")}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const isSel = selected.has(r.id);
            const status = String(r[statusField] ?? "");
            const sb = STATUS_BADGE[status];
            const color = colorField ? (r[colorField] as ColorTag | undefined) : undefined;
            return (
              <tr key={r.id} className={`border-b border-line last:border-0 ${isSel ? "bg-[var(--color-bg-subtle)]" : ""}`}>
                {enableBulk && (
                  <td className="px-4 py-3">
                    <input type="checkbox" aria-label={t("selectRow")} checked={isSel} onChange={() => toggle(r.id)} className="h-4 w-4 rounded border-line" />
                  </td>
                )}
                <td className="px-4 py-3 text-ink-heading">{String(r[titleField] ?? r.id)}</td>
                {colorField && (
                  <td className="px-4 py-3">
                    {color ? <UiBadge color={colorTagToBadge(color)}>{color}</UiBadge> : "—"}
                  </td>
                )}
                <td className="px-4 py-3">
                  {sb ? <UiBadge color={sb.color}>{t(`status.${sb.key}`)}</UiBadge> : status || "—"}
                </td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(r.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/content/${config.type}/${r.id}`} className="text-[var(--color-action-primary)] hover:underline">{t("edit")}</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("bg-BG", { day: "2-digit", month: "2-digit" });
}
