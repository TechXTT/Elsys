"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, X } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { RichTextEditor } from "@/app/admin/news/components/RichTextEditor";
import { MediaField } from "@/app/admin/media/MediaField";
import { MediaPicker } from "@/app/admin/media/MediaPicker";
import { ColorTagPicker } from "@/app/admin/content/_components/ColorTagPicker";
import { saveSimpleNews, type SimpleNewsState } from "./actions";

export interface SimpleNewsRecord {
  slug: string;
  title: string;
  excerpt?: string;
  markdown: string;
  date: string; // yyyy-mm-dd
  featuredImage?: string;
  gallery: string[];
  colorTag?: string;
  categoryPageId?: string;
  published: boolean;
}

interface Props {
  locale: Locale;
  categoryPages: { id: string; title: string }[];
  record?: SimpleNewsRecord;
}

export function SimpleEditor({ locale, categoryPages, record }: Props) {
  const t = useTranslations("Admin.simpleEditor");
  const router = useRouter();
  const isEdit = !!record;

  const [state, dispatch] = useFormState<SimpleNewsState, FormData>(saveSimpleNews, null);
  const [body, setBody] = useState(record?.markdown ?? "");
  const [gallery, setGallery] = useState<string[]>(record?.gallery ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, tick] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const visRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) router.push("/admin/news");
  }, [state, router]);

  // Autosave indicator (localStorage). Server-draft + crash recovery = G3-2.
  const draftKey = `news-simple-draft:${record?.slug ?? "new"}`;
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onInput() {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      try {
        if (!formRef.current) return;
        const data = Object.fromEntries(new FormData(formRef.current).entries());
        localStorage.setItem(draftKey, JSON.stringify({ ...data, body, gallery }));
        setSavedAt(Date.now());
      } catch { /* ignore */ }
    }, 5000);
  }
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const errors = state && !state.ok ? state.errors : {};

  function submitWith(visibility: "PUBLISHED" | "DRAFT") {
    if (visRef.current) visRef.current.value = visibility;
    formRef.current?.requestSubmit();
  }

  return (
    <div>
      {/* Header: back, title, mode toggle, autosave */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/news" className="inline-flex items-center gap-1 text-body-sm text-[var(--color-action-primary)] hover:underline">
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </Link>
          <h1 className="mt-1 text-h2 text-ink-heading">{isEdit ? t("editTitle") : t("newTitle")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-[var(--radius-md)] border border-line" role="group" aria-label={t("modeLabel")}>
            <span className="bg-[var(--color-action-primary)] px-3 py-1.5 text-body-sm font-medium text-[var(--color-text-on-action)]">{t("simple")}</span>
            <Link href="/admin/news" className="px-3 py-1.5 text-body-sm text-ink hover:bg-[var(--color-bg-subtle)]">{t("advanced")}</Link>
          </div>
          <span className="text-caption text-ink-muted" aria-live="polite">
            {savedAt ? t("autosaved") : ""}
          </span>
        </div>
      </div>

      <form ref={formRef} action={dispatch} onInput={onInput} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <input type="hidden" name="locale" value={locale} />
        {isEdit && <input type="hidden" name="editingSlug" value={record!.slug} />}
        <input type="hidden" name="body" value={body} />
        <input type="hidden" name="gallery" value={JSON.stringify(gallery)} />
        <input ref={visRef} type="hidden" name="visibility" defaultValue={record?.published ? "PUBLISHED" : "DRAFT"} />

        {/* Main column */}
        <div className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          {errors._form && (
            <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-body-sm text-[var(--color-status-danger-text)]">{errors._form}</div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-ink-heading">{t("title")} <span className="text-[var(--color-status-danger-text)]">{t("required")}</span></span>
            <input name="title" defaultValue={record?.title} required className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-[var(--color-action-primary)] focus:outline-none" />
            {errors.title && <span className="text-caption text-[var(--color-status-danger-text)]" role="alert">{errors.title}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-ink-heading">{t("excerpt")}</span>
            <textarea name="excerpt" defaultValue={record?.excerpt} rows={3} placeholder={t("excerptPlaceholder")} className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-[var(--color-action-primary)] focus:outline-none" />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-ink-heading">{t("content")}</span>
            <RichTextEditor value={body} onChange={setBody} />
          </div>

          {/* Gallery */}
          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-ink-heading">{t("gallery")}</span>
            <div className="flex flex-wrap gap-3">
              {gallery.map((url, i) => (
                <div key={`${url}-${i}`} className="relative h-20 w-24 overflow-hidden rounded-[var(--radius-md)] border border-line bg-subtle">
                  {/* admin preview, remote blob */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setGallery((g) => g.filter((_, j) => j !== i))} aria-label={t("removeImage")} className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setPickerOpen(true)} aria-label={t("addImage")} className="flex h-20 w-24 items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-line text-ink-muted hover:border-[var(--color-action-primary)]">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Aside */}
        <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-surface p-5">
          <label className="mb-4 flex flex-col gap-1 text-body-sm">
            <span className="text-ink-heading">{t("category")}</span>
            <select name="categoryPageId" defaultValue={record?.categoryPageId ?? ""} className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:outline-none focus:border-[var(--color-action-primary)]">
              <option value="">{t("noCategory")}</option>
              {categoryPages.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>

          <label className="mb-4 flex flex-col gap-1 text-body-sm">
            <span className="text-ink-heading">{t("date")}</span>
            <input type="date" name="date" defaultValue={record?.date ?? new Date().toISOString().slice(0, 10)} required className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:outline-none focus:border-[var(--color-action-primary)]" />
          </label>

          <div className="mb-4 flex flex-col gap-1.5 text-body-sm">
            <span className="text-ink-heading">{t("featured")}</span>
            <MediaField name="featuredImage" defaultValue={record?.featuredImage} folder="news" />
          </div>

          <div className="mb-4 flex flex-col gap-1.5 text-body-sm">
            <span className="text-ink-heading">{t("color")}</span>
            <ColorTagPicker name="colorTag" defaultValue={record?.colorTag || "BLUE"} />
          </div>

          <div className="flex flex-col gap-2">
            <PublishButton label={t("publish")} onClick={() => submitWith("PUBLISHED")} primary />
            <PublishButton label={t("saveDraft")} onClick={() => submitWith("DRAFT")} />
          </div>
        </aside>
      </form>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} defaultFolder="news" onSelect={(r) => setGallery((g) => [...g, r.url])} />
    </div>
  );
}

function PublishButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="button" onClick={onClick} disabled={pending}
      className={primary
        ? "rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)] disabled:opacity-50"
        : "rounded-[var(--radius-md)] border border-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-action-primary)] disabled:opacity-50"}>
      {label}
    </button>
  );
}
