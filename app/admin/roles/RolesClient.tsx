"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS, type AppRole, type Permission } from "@/lib/auth/permissions";
import { setUserRole } from "./actions";

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
}

export function RolesClient({ users }: { users: UserRow[] }) {
  const t = useTranslations("Admin.roles");
  const [rows, setRows] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function changeRole(id: string, role: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await setUserRole(id, role);
      if (!res.ok) setError(res.error ?? "Грешка.");
      else setRows((rs) => rs.map((r) => (r.id === id ? { ...r, role } : r)));
      setBusyId(null);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Permission matrix (read-only) */}
      <section className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-line text-caption uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3">{t("permission")}</th>
              {ROLES.map((r) => <th key={r} className="px-3 py-3 text-center">{t(`role.${r}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 text-ink-heading">{t(`perm.${p}`)}</td>
                {ROLES.map((r) => (
                  <td key={r} className="px-3 py-2.5 text-center">
                    {ROLE_PERMISSIONS[r as AppRole].includes(p as Permission)
                      ? <Check className="mx-auto h-4 w-4 text-[var(--color-tag-green)]" aria-label="yes" />
                      : <span className="text-ink-muted" aria-hidden>·</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {error && <p role="alert" className="text-body-sm text-[var(--color-status-danger-text)]">{error}</p>}

      {/* Per-user role assignment */}
      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        <table className="w-full text-left text-body-sm">
          <thead>
            <tr className="border-b border-line text-caption uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3">{t("user")}</th>
              <th className="px-4 py-3">{t("roleColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="text-ink-heading">{u.name || u.email}</div>
                  {u.name && <div className="text-caption text-ink-muted">{u.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-1.5 text-body-sm text-ink focus:outline-none focus:border-[var(--color-action-primary)] disabled:opacity-50"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
