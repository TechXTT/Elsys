"use client";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, X } from "lucide-react";
import { inlineUpdatePageBlock } from "@/app/admin/pages/actions";

interface Props {
  pageId: string;
  index: number;
  /** Primary text fields seeded into the drawer (mapped back by block type). */
  initialTitle: string;
  initialContent: string;
  /** Whether the content field is shown (some blocks are title-only). */
  withContent?: boolean;
  children: ReactNode;
}

/**
 * Inline <Editable> (G3-3, Figma 110:3). Admin-only affordance on a public page:
 * a dashed outline + "Редактирай" opens a right drawer that saves through the
 * page Server Action (AuditLog + revalidate). Editors never leave the page.
 */
export function InlineEditableBlock({ pageId, index, initialTitle, initialContent, withContent = true, children }: Props) {
  const t = useTranslations("Admin.inlineEdit");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await inlineUpdatePageBlock(pageId, index, title, content);
      if (!res.ok) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div data-ui="inline-editable" className="relative outline-2 -outline-offset-2 outline-dashed outline-[var(--color-action-primary)]/50 hover:outline-[var(--color-action-primary)]">
      <span className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-[var(--color-action-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-action-primary)]">
        {t("blockLabel")}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-ui="inline-edit-trigger"
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-3 py-1 text-caption font-medium text-[var(--color-text-on-action)] shadow"
      >
        <Pencil className="h-3.5 w-3.5" /> {t("edit")}
      </button>

      {children}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <aside
            className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t("drawerTitle")}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-h4 text-ink-heading">{t("drawerTitle")}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("cancel")} className="rounded p-1 text-ink-muted hover:bg-[var(--color-bg-subtle)]"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-caption text-ink-muted">{t("hint")}</p>

            <label className="flex flex-col gap-1 text-body-sm">
              <span className="text-ink-heading">{t("title")}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-[var(--color-action-primary)] focus:outline-none" />
            </label>
            {withContent && (
              <label className="flex flex-col gap-1 text-body-sm">
                <span className="text-ink-heading">{t("content")}</span>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="resize-y rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-[var(--color-action-primary)] focus:outline-none" />
              </label>
            )}
            {error && <p role="alert" className="text-caption text-[var(--color-status-danger-text)]">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={save} disabled={saving} className="rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)] disabled:opacity-50">{saving ? t("saving") : t("save")}</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-[var(--radius-md)] border border-line px-4 py-2 text-body-sm text-ink hover:bg-[var(--color-bg-subtle)]">{t("cancel")}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
