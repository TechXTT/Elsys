"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pin } from "lucide-react";
import type { ClientContentTypeConfig, ContentRecord, FieldConfig } from "@/lib/content/shared";
import { STATUS_OPTIONS } from "@/lib/content/shared";
import { MediaField } from "@/app/admin/media/MediaField";
import { deleteContentRecord } from "../actions";
import { ColorTagPicker } from "./ColorTagPicker";

type FormState = { ok: true; id: string } | { ok: false; errors: Record<string, string> } | null;
type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

interface ContentFormProps {
  config: ClientContentTypeConfig;
  record?: ContentRecord;
  action: ActionFn;
  successorNote?: string | null;
}

export function ContentForm({ config, record, action, successorNote }: ContentFormProps) {
  const t = useTranslations("Admin.contentForm");
  const router = useRouter();
  const isEdit = !!record;
  const statusField = config.statusField ?? "status";
  const enableNote = config.enableSuccessorNote !== false;

  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  const [state, dispatch] = useFormState<FormState, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) router.push(`/admin/content/${config.type}`);
  }, [state, config.type, router]);

  // Lightweight autosave indicator: persist field values to localStorage 5s after
  // the last edit (full server-draft + crash recovery is G3-2). Shows "saved Ns ago".
  const draftKey = `content-draft:${config.type}:${record?.id ?? "new"}`;
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onFormInput() {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      try {
        if (!formRef.current) return;
        const data = Object.fromEntries(new FormData(formRef.current).entries());
        localStorage.setItem(draftKey, JSON.stringify(data));
        setSavedAt(Date.now());
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    }, 5000);
  }
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  const errors = state && !state.ok ? state.errors : {};
  const fields = config.fields.filter((f) => !f.hidden);
  const asideNames = new Set([statusField, "publishAt"]);
  const mainFields = fields.filter((f) => !asideNames.has(f.name));
  const statusFieldCfg = fields.find((f) => f.name === statusField);
  const publishAtCfg = fields.find((f) => f.name === "publishAt");

  function submitWithStatus(status?: string) {
    if (status && statusRef.current) statusRef.current.value = status;
    formRef.current?.requestSubmit();
  }

  async function onDelete() {
    if (!record) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    await deleteContentRecord(config.type, record.id);
    router.push(`/admin/content/${config.type}`);
  }

  return (
    <form ref={formRef} action={dispatch} onInput={onFormInput} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Main column */}
      <div className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
        {errors._form && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-body-sm text-[var(--color-status-danger-text)]">
            {errors._form}
          </div>
        )}

        {mainFields.map((field) => (
          <FieldRow key={field.name} field={field} record={record} config={config} error={errors[field.name]} />
        ))}

        {enableNote && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="__successorNote" className="text-body-sm font-medium text-ink-heading">
              {t("successorNoteLabel")}
            </label>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-status-warning-text)]/30 bg-[var(--color-status-warning-bg)] p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-body-sm font-semibold text-[var(--color-status-warning-text)]">
                <Pin className="h-4 w-4" aria-hidden /> {t("successorNoteHeading")}
              </p>
              <textarea
                id="__successorNote"
                name="__successorNote"
                defaultValue={successorNote ?? ""}
                rows={3}
                placeholder={t("successorNotePlaceholder")}
                className="w-full resize-y bg-transparent text-body-sm text-[var(--color-status-warning-text)] placeholder:text-[var(--color-status-warning-text)]/60 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Publish aside */}
      <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <p className="pb-3 text-caption font-semibold uppercase tracking-wide text-ink-muted">{t("publishHeading")}</p>

        {statusFieldCfg && (
          <label className="mb-4 flex flex-col gap-1 text-body-sm">
            <span className="text-ink-heading">{t("status")}</span>
            <select
              ref={statusRef}
              name={statusField}
              defaultValue={record ? String(record[statusField] ?? "DRAFT") : "DRAFT"}
              className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-[var(--color-action-primary)] focus:outline-none"
            >
              {(statusFieldCfg.options ?? STATUS_OPTIONS).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        )}

        {publishAtCfg && (
          <label className="mb-4 flex flex-col gap-1 text-body-sm">
            <span className="text-ink-heading">{publishAtCfg.label}</span>
            <input
              type="datetime-local"
              name="publishAt"
              defaultValue={record && record.publishAt ? toLocalInput(record.publishAt) : ""}
              className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:border-[var(--color-action-primary)] focus:outline-none"
            />
          </label>
        )}

        <div className="flex flex-col gap-2">
          <PublishButton label={t("saveAndPublish")} onClick={() => submitWithStatus("PUBLISHED")} primary />
          <PublishButton label={t("saveDraft")} onClick={() => submitWithStatus("DRAFT")} />
        </div>

        <div className="mt-3 text-caption text-ink-muted" aria-live="polite">
          {savedAt ? t("draftSaved", { seconds: Math.max(0, Math.round((Date.now() - savedAt) / 1000)) }) : ""}
        </div>

        {isEdit && (
          <button type="button" onClick={onDelete} className="mt-4 text-body-sm font-medium text-[var(--color-status-danger-text)] hover:underline">
            {t("delete", { label: config.labelSingular.toLowerCase() })}
          </button>
        )}
      </aside>
    </form>
  );
}

function PublishButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={
        primary
          ? "rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)] disabled:opacity-50"
          : "rounded-[var(--radius-md)] border border-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-action-primary)] disabled:opacity-50"
      }
    >
      {label}
    </button>
  );
}

function FieldRow({
  field, record, config, error,
}: {
  field: FieldConfig;
  record?: ContentRecord;
  config: ClientContentTypeConfig;
  error?: string;
}) {
  const value = record ? String(record[field.name] ?? "") : "";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={field.name} className="text-body-sm font-medium text-ink-heading">
        {field.label}
        {field.required && <span className="ml-1 text-[var(--color-status-danger-text)]" aria-hidden>задължително</span>}
      </label>

      {field.type === "textarea" && (
        <textarea id={field.name} name={field.name} defaultValue={value} rows={field.rows ?? 4} placeholder={field.placeholder} className={inputClasses(!!error)} required={field.required} />
      )}
      {field.type === "richtext" && (
        <textarea id={field.name} name={field.name} defaultValue={value} rows={field.rows ?? 8} placeholder={field.placeholder} className={inputClasses(!!error)} required={field.required} />
      )}
      {field.type === "boolean" && (
        <div className="flex items-center gap-2">
          <input id={field.name} name={field.name} type="checkbox" defaultChecked={record ? Boolean(record[field.name]) : false} className="h-4 w-4 rounded border-line" />
          <span className="text-body-sm text-ink-muted">{field.placeholder ?? field.label}</span>
        </div>
      )}
      {field.type === "select" && (
        <select id={field.name} name={field.name} defaultValue={value} required={field.required} className={inputClasses(!!error)}>
          {!field.required && <option value="">— Избери —</option>}
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      {field.type === "number" && (
        <input id={field.name} name={field.name} type="number" defaultValue={value} placeholder={field.placeholder} required={field.required} className={inputClasses(!!error)} />
      )}
      {field.type === "date" && (
        <input id={field.name} name={field.name} type="datetime-local" defaultValue={value} required={field.required} className={inputClasses(!!error)} />
      )}
      {field.type === "colortag" && (
        <ColorTagPicker name={field.name} defaultValue={value || "BLUE"} />
      )}
      {field.type === "image" && (
        <MediaField name={field.name} defaultValue={value} required={field.required} folder={config.imageFolder} />
      )}
      {(field.type === "text" || field.type === "slug") && (
        field.type === "slug" && config.slugPrefix ? (
          <div className={`flex items-center overflow-hidden rounded-[var(--radius-md)] border ${error ? "border-[var(--color-status-danger-text)]" : "border-line"}`}>
            <span className="select-none bg-[var(--color-bg-subtle)] px-3 py-2 text-body-sm text-ink-muted">{config.slugPrefix}</span>
            <input id={field.name} name={field.name} type="text" defaultValue={value} placeholder={field.placeholder} required={field.required} className="flex-1 bg-surface px-3 py-2 text-body-sm text-ink focus:outline-none" />
          </div>
        ) : (
          <input id={field.name} name={field.name} type="text" defaultValue={value} placeholder={field.placeholder} required={field.required} className={inputClasses(!!error)} />
        )
      )}

      {error && <p className="text-caption text-[var(--color-status-danger-text)]" role="alert">{error}</p>}
      {field.helpText && !error && <p className="text-caption text-ink-muted">{field.helpText}</p>}
    </div>
  );
}

function toLocalInput(value: unknown): string {
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function inputClasses(hasError: boolean) {
  return [
    "block w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm text-ink bg-surface",
    "focus:outline-none focus:border-[var(--color-action-primary)]",
    hasError ? "border-[var(--color-status-danger-text)]" : "border-line",
  ].join(" ");
}
