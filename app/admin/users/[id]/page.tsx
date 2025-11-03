"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const gradeLevels = [8, 9, 10, 11, 12];
const gradeClasses = ["A", "B", "V", "G"] as const;

type EditUser = {
  id: string;
  email: string | null;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  gradeLevel?: number | null;
  gradeClass?: "A" | "B" | "V" | "G" | null;
  role?: "ADMIN" | "USER";
};

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [oneTimeLink, setOneTimeLink] = useState<string | null>(null);

  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [gradeLevel, setGradeLevel] = useState<number | "">("");
  const [gradeClass, setGradeClass] = useState<"A" | "B" | "V" | "G" | "">("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      const u: EditUser = data.user;
      setEmail(u.email || "");
      setFirstName((u.firstName ?? "") || "");
      setLastName((u.lastName ?? "") || "");
      if (typeof u.gradeLevel === "number") setGradeLevel(u.gradeLevel);
      if (u.gradeClass) setGradeClass(u.gradeClass);
      setRole(u.role || "USER");
    } catch (e: any) {
      setError(e.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          gradeLevel: typeof gradeLevel === "number" ? gradeLevel : null,
          gradeClass: gradeClass || null,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/admin/users");
    } catch (e: any) {
      setError(e.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    setResetting(true);
    setError(null);
    setOneTimeLink(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setOneTimeLink(data.oneTimeLink as string);
    } catch (e: any) {
      setError(e.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit user</h1>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">Error: {error}</p>
      ) : (
        <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={onSave}>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Email</span>
              <input required className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">First name</span>
              <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Last name</span>
              <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Grade (8-12)</span>
              <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value ? Number(e.target.value) : "") }>
                <option value="">—</option>
                {gradeLevels.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Class</span>
              <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={gradeClass} onChange={(e) => setGradeClass((e.target.value || "") as any)}>
                <option value="">—</option>
                {gradeClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Role</span>
              <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <button disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Save</button>
            </div>
          </form>
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Password</h3>
            <button
              onClick={onResetPassword}
              disabled={resetting}
              className="rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              {resetting ? "Resetting…" : "Reset password"}
            </button>
            {oneTimeLink && (
              <div className="mt-4 rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <strong className="font-semibold">One-time link:</strong>
                <div className="mt-1 flex items-center gap-2">
                  <code className="select-all break-all">{typeof window !== 'undefined' ? `${window.location.origin}${oneTimeLink}` : oneTimeLink}</code>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}${oneTimeLink}`;
                      void navigator.clipboard.writeText(url);
                    }}
                    className="rounded border border-blue-400 px-2 py-0.5 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-800/40"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-1 text-xs opacity-80">Share this link securely with the user. It works once and then expires.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
