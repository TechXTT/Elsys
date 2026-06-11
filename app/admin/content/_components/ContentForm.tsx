"use client";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { ClientContentTypeConfig, ContentRecord } from "@/lib/content/shared";

type FormState = { ok: true; id: string } | { ok: false; errors: Record<string, string> } | null;
type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

interface ContentFormProps {
  config: ClientContentTypeConfig;
  record?: ContentRecord;
  action: ActionFn;
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
    >
      {pending ? "Запазване…" : isEdit ? "Запази промените" : "Създай"}
    </button>
  );
}

export function ContentForm({ config, record, action }: ContentFormProps) {
  const router = useRouter();
  const isEdit = !!record;

  const [state, dispatch] = useFormState<FormState, FormData>(action, null);

  if (state?.ok) {
    router.push(`/admin/content/${config.type}`);
  }

  const errors = state && !state.ok ? state.errors : {};

  return (
    <form action={dispatch} className="space-y-6">
      {errors._form && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {errors._form}
        </div>
      )}

      {config.fields
        .filter((f) => !f.hidden)
        .map((field) => {
          const error = errors[field.name];
          const value = record ? String(record[field.name] ?? "") : "";

          return (
            <div key={field.name} className="space-y-1.5">
              <label
                htmlFor={field.name}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {field.label}
                {field.required && (
                  <span className="ml-1 text-red-500" aria-hidden>*</span>
                )}
              </label>

              {field.type === "textarea" && (
                <textarea
                  id={field.name}
                  name={field.name}
                  defaultValue={value}
                  rows={field.rows ?? 4}
                  placeholder={field.placeholder}
                  className={inputClasses(!!error)}
                  required={field.required}
                />
              )}

              {field.type === "boolean" && (
                <div className="flex items-center gap-2">
                  <input
                    id={field.name}
                    name={field.name}
                    type="checkbox"
                    defaultChecked={record ? Boolean(record[field.name]) : false}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {field.placeholder ?? field.label}
                  </span>
                </div>
              )}

              {field.type === "select" && (
                <select
                  id={field.name}
                  name={field.name}
                  defaultValue={value}
                  required={field.required}
                  className={inputClasses(!!error)}
                >
                  {!field.required && <option value="">— Избери —</option>}
                  {(field.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "number" && (
                <input
                  id={field.name}
                  name={field.name}
                  type="number"
                  defaultValue={value}
                  placeholder={field.placeholder}
                  required={field.required}
                  className={inputClasses(!!error)}
                />
              )}

              {field.type === "date" && (
                <input
                  id={field.name}
                  name={field.name}
                  type="datetime-local"
                  defaultValue={value}
                  required={field.required}
                  className={inputClasses(!!error)}
                />
              )}

              {(field.type === "text" || field.type === "slug" || field.type === "image") && (
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  defaultValue={value}
                  placeholder={field.placeholder}
                  required={field.required}
                  className={inputClasses(!!error)}
                />
              )}

              {field.type === "richtext" && (
                <textarea
                  id={field.name}
                  name={field.name}
                  defaultValue={value}
                  rows={field.rows ?? 8}
                  placeholder={field.placeholder ?? "Съдържание…"}
                  className={inputClasses(!!error)}
                  required={field.required}
                />
              )}

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
              {field.helpText && !error && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{field.helpText}</p>
              )}
            </div>
          );
        })}

      <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <SubmitButton isEdit={isEdit} />
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Отказ
        </button>
      </div>
    </form>
  );
}

function inputClasses(hasError: boolean) {
  return [
    "block w-full rounded-lg border px-3 py-2 text-sm shadow-sm",
    "focus:outline-none focus:ring-2 focus:ring-brand-500",
    "dark:bg-slate-800 dark:text-slate-100",
    hasError
      ? "border-red-300 dark:border-red-700 focus:border-red-400"
      : "border-slate-300 dark:border-slate-600 focus:border-brand-400",
  ].join(" ");
}
