import Link from "next/link";
import { getAllContentTypes } from "./registry";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { EmptyState } from "@/app/admin/components/EmptyState";

export default function ContentIndexPage() {
  const types = getAllContentTypes();

  return (
    <div>
      <PageHeader
        title="Съдържание"
        description="Управление на всички типове съдържание."
        breadcrumbs={[{ label: "Съдържание" }]}
      />

      {types.length === 0 ? (
        <EmptyState
          title="Няма регистрирани типове"
          description="Типовете съдържание се регистрират в app/admin/content/registry.ts."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <Link
              key={t.type}
              href={`/admin/content/${t.type}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-subtle transition hover:border-brand-400/70 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="font-semibold text-slate-900 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400">
                {t.labelPlural}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.fields.length} полета
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
