"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PageRow = { id: string; slug: string; locale: string; title: string; published: boolean; updatedAt: string };

export default function PagesAdmin() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [slugOptions, setSlugOptions] = useState<string[]>([]);
  const [newLocale, setNewLocale] = useState("bg");
  const [title, setTitle] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (locale) params.set("locale", locale);
      if (query) params.set("q", query);
      const res = await fetch(`/api/admin/pages?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setPages(data.pages as PageRow[]);
    } catch (e: any) {
      setError(e.message || "Failed to load pages");
    } finally {
      setLoading(false);
    }
  }

  // Debounce search to avoid flashing on each keystroke
  const debouncedQuery = useDebouncedValue(query, 300);
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    async function refetch() {
      setFetching(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (locale) params.set("locale", locale);
        if (debouncedQuery) params.set("q", debouncedQuery);
        const res = await fetch(`/api/admin/pages?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Load failed");
        setPages(data.pages as PageRow[]);
      } catch (e: any) {
        setError(e.message || "Failed to load pages");
      } finally {
        setFetching(false);
      }
    }
    void refetch();
  }, [locale, debouncedQuery]);

  // Load slug suggestions once
  useEffect(() => {
    let aborted = false;
    fetch("/api/admin/pages/slugs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!aborted && Array.isArray(d?.slugs)) setSlugOptions(d.slugs);
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, locale: newLocale, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setSlug("");
      setNewLocale("bg");
      setTitle("");
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to create page");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pages</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Edit site pages content per locale in a headless-CMS fashion.</p>
      </header>

      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Locale</span>
            <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="">All</option>
              <option value="bg">bg</option>
              <option value="en">en</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Search</span>
            <input className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title or slug" />
          </label>
          {fetching && <span className="text-xs text-slate-500">Searching…</span>}
        </div>
        <div className="mt-4 overflow-hidden rounded border border-slate-200 dark:border-slate-700">
          {loading ? (
            <p className="p-3 text-sm text-slate-500">Loading…</p>
          ) : error ? (
            <p className="p-3 text-sm text-red-600">Error: {error}</p>
          ) : pages.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">No pages yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Locale</th>
                  <th className="px-3 py-2">Published</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2"><div className="truncate max-w-[20rem]">{p.title}</div></td>
                    <td className="px-3 py-2"><code className="text-xs">{p.slug}</code></td>
                    <td className="px-3 py-2">{p.locale}</td>
                    <td className="px-3 py-2">{p.published ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">{new Date(p.updatedAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <Link href={("/admin/pages/" + p.id) as any} className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Create page</h2>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-3" onSubmit={onCreate}>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-slate-700 dark:text-slate-200">Slug</span>
            {useCustomSlug ? (
              <input required className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. uchilishteto/some-page or home" />
            ) : (
              <select required className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={slug} onChange={(e) => setSlug(e.target.value)}>
                <option value="">Select a slug…</option>
                {slugOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <label className="mt-1 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={useCustomSlug} onChange={(e) => setUseCustomSlug(e.target.checked)} />
              <span className="text-slate-600 dark:text-slate-400">Use custom slug</span>
            </label>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Locale</span>
            <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={newLocale} onChange={(e) => setNewLocale(e.target.value)}>
              <option value="bg">bg</option>
              <option value="en">en</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-3">
            <span className="text-slate-700 dark:text-slate-200">Title</span>
            <input required className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="sm:col-span-3">
            <button disabled={creating} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Create</button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced as T;
}
