import Link from "next/link";
import { getTranslations } from "next-intl/server";
import "./types"; // register all content types
import { getAllContentTypes } from "./registry";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { prisma } from "@/lib/prisma";

export default async function ContentIndexPage() {
  const types = getAllContentTypes();
  const t = await getTranslations("Admin.content");

  // Per-type record count (the card used to show the field count). Best-effort —
  // a type whose modelName isn't a queryable Prisma model falls back to 0.
  const counts = await Promise.all(
    types.map(async (ct) => {
      const accessor = ct.modelName.charAt(0).toLowerCase() + ct.modelName.slice(1);
      try { return (await (prisma as any)[accessor].count()) as number; }
      catch { return 0; }
    }),
  );

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
          {types.map((ct, i) => (
            <Link
              key={ct.type}
              href={`/admin/content/${ct.type}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-subtle transition hover:border-brand-400/70 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="font-semibold text-slate-900 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400">
                {ct.labelPlural}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("recordCount", { count: counts[i] })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
