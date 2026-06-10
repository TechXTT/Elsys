import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getContentType } from "../registry";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { ContentListTable } from "../_components/ContentListTable";
import { EmptyState } from "@/app/admin/components/EmptyState";
import type { ContentRecord } from "@/lib/content/shared";

const PAGE_SIZE = 20;

interface Props {
  params: { type: string };
  searchParams: { page?: string; q?: string; sort?: string };
}

export default async function ContentListPage({ params, searchParams }: Props) {
  const config = getContentType(params.type);
  if (!config) notFound();

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const q = searchParams.q?.trim() ?? "";
  const sort = searchParams.sort ?? config.defaultSort ?? "createdAt";

  const model = (prisma as Record<string, any>)[
    config.modelName.charAt(0).toLowerCase() + config.modelName.slice(1)
  ];

  const where = q && config.searchFields?.length
    ? {
        OR: config.searchFields.map((f) => ({
          [f]: { contains: q, mode: "insensitive" as const },
        })),
      }
    : undefined;

  const [total, records] = await Promise.all([
    model.count({ where }),
    model.findMany({
      where,
      orderBy: { [sort]: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: Object.fromEntries([
        ["id", true],
        ...config.columns.map((c) => [c.key, true]),
      ]),
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const tableColumns = config.columns.map((col) => ({
    key: col.key,
    header: col.label,
  }));

  tableColumns.push({
    key: "_actions",
    header: "",
  });

  const tableData = (records as ContentRecord[]).map((r) => ({
    ...r,
    _actions: r.id,
  }));

  return (
    <div>
      <PageHeader
        title={config.labelPlural}
        breadcrumbs={[{ label: "Съдържание" }, { label: config.labelPlural }]}
        actions={
          <Link
            href={`/admin/content/${params.type}/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Ново
          </Link>
        }
      />

      {/* Search bar */}
      {config.searchFields?.length ? (
        <form method="get" className="mb-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Търси…"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Търси
          </button>
        </form>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {tableData.length === 0 ? (
          <EmptyState
            title={`Няма ${config.labelPlural.toLowerCase()}`}
            description="Започни като добавиш първия запис."
            action={{ label: "Добави", href: `/admin/content/${params.type}/new` }}
          />
        ) : (
          <ContentListTable
            type={params.type}
            columns={config.columns}
            records={tableData}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>
            {total} записа — страница {page} от {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                ← Предишна
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                Следваща →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
