"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { MediaItem } from "@/lib/media";
import { MEDIA_FOLDERS } from "@/lib/media/folders";
import { fetchMedia } from "./actions";
import { MediaCard } from "./_components/MediaCard";

export interface MediaPickResult {
  url: string;
  alt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (result: MediaPickResult) => void;
  /** Default folder to scope the grid to on open. */
  defaultFolder?: string;
}

/** Reusable modal that picks a Media Library asset for any image field. */
export function MediaPicker({ open, onClose, onSelect, defaultFolder }: Props) {
  const t = useTranslations("Admin.media");
  const [folder, setFolder] = useState<string>(defaultFolder ?? "all");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    startLoad(async () => {
      setItems(await fetchMedia(folder === "all" ? undefined : folder));
    });
  }, [open, folder]);

  if (!open) return null;

  const selected = items.find((m) => m.id === selectedId) ?? null;

  function confirm() {
    if (!selected) return;
    onSelect({ url: selected.url, alt: selected.alt ?? "" });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("pickerTitle")}
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-h4 text-ink-heading">{t("pickerTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("cancel")} className="rounded p-1 text-ink-muted hover:bg-[var(--color-bg-subtle)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-2">
          {["all", ...MEDIA_FOLDERS].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFolder(f)}
              className={`rounded-[var(--radius-full)] px-3 py-1 text-caption transition ${
                folder === f
                  ? "bg-[var(--color-action-primary)] text-[var(--color-text-on-action)]"
                  : "bg-[var(--color-bg-subtle)] text-ink-muted hover:text-ink"
              }`}
            >
              {t(`folders.${f}`)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-body-sm text-ink-muted">…</p>
          ) : items.length === 0 ? (
            <p className="text-center text-body-sm text-ink-muted">{t("empty")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((m) => (
                <li key={m.id}>
                  <MediaCard item={m} selected={m.id === selectedId} onClick={() => setSelectedId(m.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-[var(--radius-md)] border border-line px-4 py-2 text-body-sm text-ink hover:bg-[var(--color-bg-subtle)]">
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!selected}
            className="rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)] disabled:opacity-50"
          >
            {t("pick")}
          </button>
        </div>
      </div>
    </div>
  );
}
