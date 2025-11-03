import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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

  const page = Math.max(1, Number(searchParams?.page || 1) || 1);
  const action = (searchParams?.action || "").trim();
  const entity = (searchParams?.entity || "").trim();
  const userId = (searchParams?.userId || "").trim();

  const where: any = {};
  if (action) where.action = { contains: action };
  if (entity) where.entity = { equals: entity };
  if (userId) where.userId = { equals: userId };

  type AuditLogRow = {
    id: string;
    userId: string | null;
    action: string;
    entity: string | null;
    entityId: string | null;
    details: any;
    ip: string | null;
    userAgent: string | null;
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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Audit logs</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Inspect admin actions across the system. Latest first.</p>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">{total.toLocaleString()} entries</span>
      </header>

      <form className="grid grid-cols-1 gap-3 rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-4" method="get">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-700 dark:text-slate-200">Action contains</span>
          <input name="action" defaultValue={action} className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800" placeholder="e.g. news.update" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-700 dark:text-slate-200">Entity equals</span>
          <input name="entity" defaultValue={entity} className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800" placeholder="e.g. news" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-700 dark:text-slate-200">User ID</span>
          <input name="userId" defaultValue={userId} className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800" placeholder="cuid…" />
        </label>
        <div className="flex items-end gap-2">
          <button className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">Filter</button>
          <Link href="/admin/audit" className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Reset</Link>
        </div>
      </form>

      <section className="overflow-x-auto rounded border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Time</th>
              <th className="px-3 py-2 text-left font-semibold">User</th>
              <th className="px-3 py-2 text-left font-semibold">Action</th>
              <th className="px-3 py-2 text-left font-semibold">Entity</th>
              <th className="px-3 py-2 text-left font-semibold">Entity ID</th>
              <th className="px-3 py-2 text-left font-semibold">IP</th>
              <th className="px-3 py-2 text-left font-semibold">User Agent</th>
              <th className="px-3 py-2 text-left font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-slate-500">No audit entries.</td>
              </tr>
            ) : (
              logs.map((log: AuditLogRow) => {
                const userLabel = log.user
                  ? `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() || log.user.email || log.user.id
                  : "–";
                const detailsString = log.details ? JSON.stringify(log.details, null, 2) : "";
                return (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-400">{formatDateTime(log.createdAt)}</td>
                    <td className="max-w-[14rem] truncate px-3 py-2">
                      {log.user ? (
                        <div className="flex flex-col">
                          <span className="truncate font-medium text-slate-900 dark:text-slate-100">{userLabel}</span>
                          {log.user.email && <span className="truncate text-xs text-slate-500">{log.user.email}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-500">(anon)</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{log.action}</td>
                    <td className="px-3 py-2">{log.entity || ""}</td>
                    <td className="px-3 py-2 font-mono">{log.entityId || ""}</td>
                    <td className="px-3 py-2">{log.ip || ""}</td>
                    <td className="px-3 py-2 max-w-[16rem] truncate" title={log.userAgent || undefined}>{log.userAgent || ""}</td>
                    <td className="px-3 py-2">
                      {detailsString ? (
                        <details className="group">
                          <summary className="cursor-pointer select-none text-slate-700 underline group-open:mb-2 dark:text-slate-300">View</summary>
                          <pre className="max-h-64 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
                            {detailsString}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-slate-400">—</span>
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
        <div className="text-xs text-slate-500">Page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <Link
            href={{ pathname: "/admin/audit", query: { ...((action && { action }) || {}), ...((entity && { entity }) || {}), ...((userId && { userId }) || {}), page: Math.max(1, page - 1) } } as any}
            className={`rounded border px-3 py-1 text-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <Link
            href={{ pathname: "/admin/audit", query: { ...((action && { action }) || {}), ...((entity && { entity }) || {}), ...((userId && { userId }) || {}), page: Math.min(totalPages, page + 1) } } as any}
            className={`rounded border px-3 py-1 text-sm ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
