"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const gradeLevels = [8, 9, 10, 11, 12];
const gradeClasses = ["A", "B", "V", "G"] as const;

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<number | "">("");
  const [gradeClass, setGradeClass] = useState<"A" | "B" | "V" | "G" | "">("");
  const [creating, setCreating] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(data.users);
    } catch (e: any) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setGeneratedPassword(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          gradeLevel: typeof gradeLevel === "number" ? gradeLevel : undefined,
          gradeClass: gradeClass || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setGeneratedPassword(data.password as string);
      setEmail("");
      setFirstName("");
      setLastName("");
      setGradeLevel("");
      setGradeClass("");
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Потребители</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Създаване и управление на потребители (ученици/админи).</p>
      </header>

      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Създай потребител</h2>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Email</span>
            <input required className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Име</span>
              <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Фамилия</span>
              <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Клас (8-12)</span>
              <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value ? Number(e.target.value) : "") }>
                <option value="">—</option>
                {gradeLevels.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Паралелка</span>
              <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={gradeClass} onChange={(e) => setGradeClass((e.target.value || "") as any)}>
                <option value="">—</option>
                {gradeClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="sm:col-span-2">
            <button disabled={creating} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Създай</button>
          </div>
        </form>
        {generatedPassword && (
          <div className="mt-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">
            <strong className="font-semibold">Генерирана парола:</strong> <code className="select-all">{generatedPassword}</code>
            <p className="mt-1 text-xs opacity-80">Запишете тази парола – показва се само веднъж.</p>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Списък потребители</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Зареждане…</p>
        ) : error ? (
          <p className="text-sm text-red-600">Грешка: {error}</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-500">Няма потребители.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{u.name || "(без име)"}</div>
                  <div className="truncate text-xs text-slate-600 dark:text-slate-400">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/users/${u.id}` as any} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Редакция</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
