import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SearchParams = {
  page?: string;
  action?: string;
  entity?: string;
  userId?: string;
};

const PAGE_SIZE = 50;

function formatDateTime(value: Date) {
  try {
    return new Intl.DateTimeFormat("bg-BG", {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

export default async function AuditLogsPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  const isAdmin = (session.user as any)?.role === "ADMIN";
  if (!isAdmin) redirect("/admin");

  const t = await getTranslations("Admin.audit");

  const page = Math.max(1, Number(searchParams?.page || 1) || 1);
  const action = (searchParams?.action || "").trim();
  const entity = (searchParams?.entity || "").trim();
  const userId = (searchParams?.userId || "").trim();

  const where: any = {};
  if (action) where.action = { contains: action };
  if (entity) where.entity = { equals: entity };
  if (userId) where.userId = { equals: userId };

  type AuditLogRow = {
    id: string; userId: string | null; action: string; entity: string | null;
    entityId: string | null; details: any; ip: string | null; userAgent: string | null;
    createdAt: Date;
    user: { id: string; email: string | null; firstName: string | null; lastName: string | null } | null;
  };

  const [total, logs] = await Promise.all([
    (prisma as any).auditLog.count({ where }) as Promise<number>,
    (prisma as any).auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }) as Promise<AuditLogRow[]>,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const inputCls =
    "text-body-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-[var(--spacing-sm)] py-1.5 text-[var(--color-text-body)] focus:border-[var(--color-action-secondary-border)] focus:outline-none";
  const th = "px-[var(--spacing-sm)] py-2 text-left text-overline text-[var(--color-text-muted)]";
  const td = "px-[var(--spacing-sm)] py-2 align-top text-[var(--color-text-body)]";

  return (
    <div className="space-y-[var(--spacing-lg)]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 text-[var(--color-text-heading)]">{t("title")}</h1>
          <p className="text-body-sm text-[var(--color-text-muted)]">{t("subtitle")}</p>
        </div>
        <span className="text-body-sm text-[var(--color-text-muted)]">{t("entries", { count: total })}</span>
      </header>

      {/* Read-only filters (no edit/delete affordances — immutable log). */}
      <form className="grid grid-cols-1 gap-[var(--spacing-sm)] rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[var(--spacing-md)] sm:grid-cols-4" method="get">
        <label className="text-body-sm flex flex-col gap-1">
          <span className="text-[var(--color-text-body)]">{t("filterAction")}</span>
          <input name="action" defaultValue={action} className={inputCls} placeholder="news.update" />
        </label>
        <label className="text-body-sm flex flex-col gap-1">
          <span className="text-[var(--color-text-body)]">{t("filterEntity")}</span>
          <input name="entity" defaultValue={entity} className={inputCls} placeholder="news" />
        </label>
        <label className="text-body-sm flex flex-col gap-1">
          <span className="text-[var(--color-text-body)]">{t("filterUser")}</span>
          <input name="userId" defaultValue={userId} className={inputCls} placeholder="cuid…" />
        </label>
        <div className="flex items-end gap-2">
          <button data-ui="admin-button" className="text-body-sm min-h-9 rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-[var(--spacing-md)] font-medium text-[var(--color-text-on-action)]">{t("filter")}</button>
          <Link href="/admin/audit" className="text-body-sm min-h-9 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-[var(--spacing-md)] py-2 text-[var(--color-text-body)] hover:bg-[var(--color-bg-subtle)]">{t("reset")}</Link>
        </div>
      </form>

      <section className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
        <table className="text-body-sm min-w-full">
          <thead className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
            <tr>
              <th className={th}>{t("colTime")}</th>
              <th className={th}>{t("colUser")}</th>
              <th className={th}>{t("colAction")}</th>
              <th className={th}>{t("colEntity")}</th>
              <th className={th}>{t("colEntityId")}</th>
              <th className={th}>{t("colIp")}</th>
              <th className={th}>{t("colDetails")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-default)]">
            {logs.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-[var(--color-text-muted)]">{t("empty")}</td></tr>
            ) : (
              logs.map((log) => {
                const userLabel = log.user
                  ? `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() || log.user.email || log.user.id
                  : "–";
                const detailsString = log.details ? JSON.stringify(log.details, null, 2) : "";
                return (
                  <tr key={log.id}>
                    <td className={`${td} whitespace-nowrap text-[var(--color-text-muted)]`}>{formatDateTime(log.createdAt)}</td>
                    <td className={`${td} max-w-[14rem] truncate`}>
                      {log.user ? (
                        <span className="flex flex-col">
                          <span className="truncate font-medium text-[var(--color-text-heading)]">{userLabel}</span>
                          {log.user.email && <span className="text-caption truncate text-[var(--color-text-muted)]">{log.user.email}</span>}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">{t("anon")}</span>
                      )}
                    </td>
                    <td className={`${td} font-mono`}>{log.action}</td>
                    <td className={td}>{log.entity || ""}</td>
                    <td className={`${td} font-mono`}>{log.entityId || ""}</td>
                    <td className={td}>{log.ip || ""}</td>
                    <td className={td}>
                      {detailsString ? (
                        <details className="group">
                          <summary className="cursor-pointer select-none text-[var(--color-text-link)] underline">{t("view")}</summary>
                          <pre className="text-caption mt-2 max-h-64 overflow-auto rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] p-2 text-[var(--color-text-body)]">{detailsString}</pre>
                        </details>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <div className="flex items-center justify-between">
        <div className="text-caption text-[var(--color-text-muted)]">{t("pageOf", { page, totalPages })}</div>
        <div className="flex gap-2">
          <Link
            href={{ pathname: "/admin/audit", query: { ...((action && { action }) || {}), ...((entity && { entity }) || {}), ...((userId && { userId }) || {}), page: Math.max(1, page - 1) } } as any}
            className={`text-body-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-[var(--spacing-md)] py-1 text-[var(--color-text-body)] hover:bg-[var(--color-bg-subtle)] ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            {t("previous")}
          </Link>
          <Link
            href={{ pathname: "/admin/audit", query: { ...((action && { action }) || {}), ...((entity && { entity }) || {}), ...((userId && { userId }) || {}), page: Math.min(totalPages, page + 1) } } as any}
            className={`text-body-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-[var(--spacing-md)] py-1 text-[var(--color-text-body)] hover:bg-[var(--color-bg-subtle)] ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            {t("next")}
          </Link>
        </div>
      </div>
    </div>
  );
}
