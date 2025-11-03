"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt?: string;
  role?: "ADMIN" | "USER";
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAdmins(data.admins);
    } catch (e: any) {
      setError(e.message || "Failed to load admins");
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
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, password }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Create failed");
      setEmail("");
      setName("");
      setPassword("");
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to create admin");
    } finally {
      setCreating(false);
    }
  }

  async function onDemote(id: string) {
    if (!confirm("Demote this admin to a regular user?")) return;
    await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "USER" }),
    });
    await load();
  }

  async function onPromote(id: string) {
    await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "ADMIN" }),
    });
    await load();
  }

  async function onDelete(id: string) {
    if (!confirm("Are you sure you want to delete this admin?")) return;
    await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Admins</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Add new admins and manage existing ones.</p>
      </header>

      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Add admin</h2>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Email</span>
            <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Name (optional)</span>
            <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-slate-700 dark:text-slate-200">Password</span>
            <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <div className="sm:col-span-2">
            <button disabled={creating} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Add</button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Admins list</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">Error: {error}</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-slate-500">No admins.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {admins.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{u.name || "(no name)"}</div>
                  <div className="truncate text-xs text-slate-600 dark:text-slate-400">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onDemote(u.id)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                    Demote to user
                  </button>
                  <button onClick={() => onDelete(u.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
