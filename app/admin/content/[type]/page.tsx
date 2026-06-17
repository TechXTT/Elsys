import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import "../types"; // register all content types
import { getContentType } from "../registry";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { ContentListClient } from "../_components/ContentListClient";
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
  const t = await getTranslations("Admin.contentList");

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const q = searchParams.q?.trim() ?? "";
  const sort = searchParams.sort ?? config.defaultSort ?? "createdAt";

  const model = (prisma as Record<string, any>)[
    config.modelName.charAt(0).toLowerCase() + config.modelName.slice(1)
  ];

  const where = q && config.searchFields?.length
    ? { OR: config.searchFields.map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) }
    : undefined;

  // Explicit select: id + title/status/color/updatedAt + any column keys.
  const selectKeys = new Set<string>(["id", "updatedAt", config.titleField ?? "title", config.statusField ?? "status"]);
  if (config.colorField) selectKeys.add(config.colorField);
  for (const c of config.columns) selectKeys.add(c.key);
  const select = Object.fromEntries(Array.from(selectKeys).map((k) => [k, true]));

  const [total, records] = await Promise.all([
    model.count({ where }),
    model.findMany({ where, orderBy: { [sort]: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const { schema: _schema, ...clientConfig } = config;

  return (
    <div>
      <PageHeader
        title={config.labelPlural}
        description={t("subtitle", { count: total })}
        breadcrumbs={[{ label: t("breadcrumb") }, { label: config.labelPlural }]}
        actions={
          <Link href={`/admin/content/${params.type}/new`} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-text-on-action)]">
            <Plus className="h-4 w-4" /> {t("new", { label: config.labelSingular.toLowerCase() })}
          </Link>
        }
      />

      {config.searchFields?.length ? (
        <form method="get" className="mb-4 flex gap-2">
          <input name="q" defaultValue={q} placeholder={t("search")} className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2 text-body-sm text-ink focus:outline-none focus:border-[var(--color-action-primary)]" />
          <button type="submit" className="rounded-[var(--radius-md)] border border-line px-3 py-2 text-body-sm hover:bg-[var(--color-bg-subtle)]">{t("searchButton")}</button>
        </form>
      ) : null}

      {records.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface">
          <EmptyState title={t("emptyTitle", { label: config.labelPlural.toLowerCase() })} description={t("emptyBody")} action={{ label: t("add"), href: `/admin/content/${params.type}/new` }} />
        </div>
      ) : (
        <ContentListClient config={clientConfig} records={records as ContentRecord[]} />
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-body-sm text-ink-muted">
          <span>{t("pageOf", { total, page, totalPages })}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="rounded border border-line px-3 py-1 hover:bg-[var(--color-bg-subtle)]">← {t("prev")}</Link>}
            {page < totalPages && <Link href={`?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="rounded border border-line px-3 py-1 hover:bg-[var(--color-bg-subtle)]">{t("next")} →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
