"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type PageDto = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  excerpt?: string | null;
  bodyMarkdown?: string | null;
  published: boolean;
};

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [slug, setSlug] = useState("");
  const [locale, setLocale] = useState("bg");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);
  const [blocksText, setBlocksText] = useState<string>("");
  const [blocksError, setBlocksError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      const p: PageDto = data.page;
      setSlug(p.slug);
      setLocale(p.locale);
      setTitle(p.title);
      setExcerpt(p.excerpt ?? "");
      setBody(p.bodyMarkdown ?? "");
      setPublished(p.published);
      // Load blocks JSON if present
      try {
        const full = await fetch(`/api/admin/pages/${id}`, { cache: "no-store" }).then(r => r.json());
        const b = full?.page?.blocks;
        setBlocksText(b ? JSON.stringify(b, null, 2) : "");
      } catch {
        // ignore blocks fetch error
      }
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) void load(); }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let blocks: unknown = undefined;
      setBlocksError(null);
      if (blocksText.trim()) {
        try {
          blocks = JSON.parse(blocksText);
          if (!Array.isArray(blocks)) throw new Error("Blocks must be an array");
        } catch (e: any) {
          setBlocksError(e.message || "Invalid blocks JSON");
          setSaving(false);
          return;
        }
      }
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, locale, title, excerpt, bodyMarkdown: body, blocks, published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/admin/pages");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete this page?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      router.push("/admin/pages");
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const preview = useMemo(() => body, [body]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit page</h1>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">Error: {error}</p>
      ) : (
        <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={onSave}>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Slug</span>
              <input required className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Locale</span>
              <select className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={locale} onChange={(e) => setLocale(e.target.value)}>
                <option value="bg">bg</option>
                <option value="en">en</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-slate-700 dark:text-slate-200">Title</span>
              <input required className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-slate-700 dark:text-slate-200">Excerpt</span>
              <textarea className="min-h-[80px] rounded border border-slate-300 px-2 py-1 dark:border-slate-600" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-slate-700 dark:text-slate-200">Body (Markdown)</span>
              <textarea className="min-h-[240px] rounded border border-slate-300 px-2 py-1 font-mono dark:border-slate-600" value={body} onChange={(e) => setBody(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-slate-700 dark:text-slate-200">Blocks (JSON array) — optional</span>
              <textarea className="min-h-[160px] rounded border border-slate-300 px-2 py-1 font-mono dark:border-slate-600" value={blocksText} onChange={(e) => setBlocksText(e.target.value)} placeholder='[
  { "type": "Hero", "props": { "heading": "Welcome" } },
  { "type": "Markdown", "props": { "value": "**Hello**" } }
]'
              />
              {blocksError && <span className="text-xs text-red-600">{blocksError}</span>}
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span className="text-slate-700 dark:text-slate-200">Published</span>
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Save</button>
              <button type="button" disabled={deleting} onClick={onDelete} className="rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30">Delete</button>
            </div>
          </form>
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Preview</h3>
            <div className="prose prose-slate max-w-none dark:prose-invert">
              <ReactMarkdown>{preview}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
