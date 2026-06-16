"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Check, ShieldAlert } from "lucide-react";
import type { MediaItem } from "@/lib/media";
import { mediaNeedsAttention } from "@/lib/media";

interface Props {
  item: MediaItem;
  selected?: boolean;
  onClick?: () => void;
}

/** Grid tile used by both the Media Library and the MediaPicker modal. */
export function MediaCard({ item, selected, onClick }: Props) {
  const t = useTranslations("Admin.media");
  const isImage = item.mimeType.startsWith("image/");
  const altOk = !!item.alt && item.alt.trim().length > 0;
  const needsConsent = item.isMinorPhoto && !item.consentRecordedAt;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-surface text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-primary)] ${
        selected
          ? "border-[var(--color-action-primary)] ring-2 ring-[var(--color-action-primary)]"
          : "border-line hover:border-[var(--color-action-primary)]"
      }`}
    >
      <div className="relative aspect-[3/2] w-full bg-[var(--color-bg-subtle)]">
        {isImage ? (
          /* admin-only, remote blob; plain img avoids next/image host config */
          <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-caption uppercase text-ink-muted">
            {item.mimeType.split("/")[1] ?? "file"}
          </span>
        )}
        {item.isMinorPhoto && (
          <span
            className={`absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-[10px] font-semibold uppercase ${
              needsConsent
                ? "bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)]"
                : "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]"
            }`}
          >
            {needsConsent && <ShieldAlert className="h-3 w-3" aria-hidden />}
            {t("consent")}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-2">
        <span className="truncate text-body-sm text-ink-heading" title={item.filename}>
          {item.filename}
        </span>
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5 text-[10px] font-semibold uppercase ${
            altOk
              ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]"
              : "bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)]"
          }`}
        >
          {altOk ? <Check className="h-3 w-3" aria-hidden /> : <AlertTriangle className="h-3 w-3" aria-hidden />}
          {altOk ? t("altOk") : t("altMissing")}
        </span>
      </div>
    </button>
  );
}

export { mediaNeedsAttention };
