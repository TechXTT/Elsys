"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload, Trash2 } from "lucide-react";
import type { MediaItem } from "@/lib/media";
import { MEDIA_FOLDERS, DEFAULT_FOLDER } from "@/lib/media/folders";
import { uploadMedia, updateMediaMeta, deleteMedia } from "../actions";
import { MediaCard } from "./MediaCard";

interface Props {
  items: MediaItem[];
  counts: Record<string, number>;
}

export function MediaLibraryClient({ items, counts }: Props) {
  const t = useTranslations("Admin.media");
  const router = useRouter();
  const [folder, setFolder] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visible = folder === "all" ? items : items.filter((m) => m.folder === folder);
  const selected = items.find((m) => m.id === selectedId) ?? null;

  function doUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    const target = folder === "all" ? DEFAULT_FOLDER : folder;
    startTransition(async () => {
      const res = await uploadMedia(target, fd);
      if (!res.ok) setUploadError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_minmax(0,1fr)_300px]">
      {/* Folder rail */}
      <nav aria-label={t("foldersTitle")} className="rounded-[var(--radius-lg)] border border-line bg-surface p-3">
        <p className="px-2 pb-2 text-caption font-semibold uppercase tracking-wide text-ink-muted">{t("foldersTitle")}</p>
        <ul className="flex flex-col gap-0.5">
          {["all", ...MEDIA_FOLDERS].map((f) => (
            <li key={f}>
              <button
                type="button"
                onClick={() => setFolder(f)}
                className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-body-sm transition ${
                  folder === f
                    ? "bg-[var(--color-action-primary)] font-medium text-[var(--color-text-on-action)]"
                    : "text-ink hover:bg-[var(--color-bg-subtle)]"
                }`}
              >
                <span>{t(`folders.${f}`)}</span>
                <span className={folder === f ? "text-[var(--color-text-on-action)]" : "text-ink-muted"}>
                  {counts[f] ?? 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Grid + dropzone */}
      <div className="flex flex-col gap-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            doUpload(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-[64px] cursor-pointer items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed border-line bg-surface px-4 py-5 text-center text-body-sm text-ink-muted transition hover:border-[var(--color-action-primary)]"
        >
          <Upload className="mr-2 h-4 w-4" aria-hidden />
          {busy ? t("uploading") : t("dropzone")}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            aria-label={t("upload")}
            className="sr-only"
            onChange={(e) => doUpload(e.target.files)}
          />
        </div>
        {uploadError && (
          <p role="alert" className="text-body-sm text-[var(--color-status-danger-text)]">
            {uploadError}
          </p>
        )}

        {visible.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center text-body-sm text-ink-muted">
            {t("empty")}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((m) => (
              <li key={m.id}>
                <MediaCard item={m} selected={m.id === selectedId} onClick={() => setSelectedId(m.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Details panel */}
      <aside className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
        <p className="pb-3 text-caption font-semibold uppercase tracking-wide text-ink-muted">{t("details")}</p>
        {selected ? (
          <DetailsPanel key={selected.id} item={selected} busy={busy} onChanged={() => router.refresh()} />
        ) : (
          <p className="text-body-sm text-ink-muted">{t("selectPrompt")}</p>
        )}
      </aside>
    </div>
  );
}

function DetailsPanel({ item, busy, onChanged }: { item: MediaItem; busy: boolean; onChanged: () => void }) {
  const t = useTranslations("Admin.media");
  const [alt, setAlt] = useState(item.alt ?? "");
  const [isMinor, setIsMinor] = useState(item.isMinorPhoto);
  const [consent, setConsent] = useState(!!item.consentRecordedAt);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const isImage = item.mimeType.startsWith("image/");

  function save() {
    setError(null);
    startSave(async () => {
      const res = await updateMediaMeta(item.id, { alt, isMinorPhoto: isMinor, consentRecorded: consent });
      if (!res.ok) setError(Object.values(res.errors)[0] ?? "Грешка.");
      else onChanged();
    });
  }

  function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    startDelete(async () => {
      await deleteMedia(item.id);
      onChanged();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[3/2] w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)]">
        {isImage ? (
          /* admin-only remote blob — plain img avoids next/image host config */
          <img src={item.url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <p className="truncate text-h4 text-ink-heading" title={item.filename}>{item.filename}</p>
      <p className="text-caption text-ink-muted">
        {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
        {Math.round(item.size / 1024)} KB · {t("uploadedOn")} {new Date(item.createdAt).toLocaleDateString("bg-BG")}
      </p>

      <label className="flex flex-col gap-1 text-body-sm">
        <span className="text-ink-heading">
          {t("altLabel")} <span className="text-[var(--color-status-danger-text)]">{t("required")}</span>
        </span>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-[var(--color-action-primary)] focus:outline-none"
        />
      </label>

      <div className="rounded-[var(--radius-md)] border border-line bg-[var(--color-bg-subtle)] p-3">
        <label className="flex items-center gap-2 text-body-sm text-ink-heading">
          <input type="checkbox" checked={isMinor} onChange={(e) => setIsMinor(e.target.checked)} />
          {t("minorPhoto")}
        </label>
        {isMinor && (
          <label className="mt-2 flex items-center gap-2 text-caption text-ink-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {consent && item.consentRecordedAt
              ? `${t("consentRecorded")} · ${new Date(item.consentRecordedAt).toLocaleDateString("bg-BG")}`
              : t("consentMissing")}
          </label>
        )}
      </div>

      {error && <p role="alert" className="text-caption text-[var(--color-status-danger-text)]">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving || busy}
          className="rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)] disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-body-sm font-medium text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-bg)] disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("delete")}
        </button>
      </div>
    </div>
  );
}
