"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { renderBlocks } from "@/lib/cms";
import { validateBlocks } from "@/lib/blocks/registry";
import BlockEditor from "@/components/admin/BlockEditor";

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
  // Internal page id we are editing; allows locale switch without route navigation
  const [currentId, setCurrentId] = useState<string>(id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [slug, setSlug] = useState("");
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [slugOptions, setSlugOptions] = useState<string[]>([]);
  const [locale, setLocale] = useState("bg");
  const [creatingForLocale, setCreatingForLocale] = useState<boolean>(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);
  const [blocksText, setBlocksText] = useState<string>("");
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [blocksValidationErrors, setBlocksValidationErrors] = useState<string[]>([]);
  const [useVisualBlocksEditor, setUseVisualBlocksEditor] = useState<boolean>(true);
  const [versions, setVersions] = useState<{ id: string; version: number; published: boolean; createdAt: string; createdById?: string | null }[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);

  async function load(targetId: string = currentId) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${targetId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      const p: PageDto = data.page;
      setSlug(p.slug);
      setLocale(p.locale);
      setTitle(p.title);
      setExcerpt(p.excerpt ?? "");
      setBody(p.bodyMarkdown ?? "");
      setPublished(p.published);
      setCreatingForLocale(false);
      // Load blocks JSON if present
      try {
        const full = await fetch(`/api/admin/pages/${targetId}`, { cache: "no-store" }).then(r => r.json());
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

  // Initial hydrate from route param
  useEffect(() => { if (id) { setCurrentId(id); void load(id); void loadVersions(id); } }, [id]);

  async function findPageIdBySlugLocale(targetSlug: string, targetLocale: string): Promise<string | null> {
    try {
      const params = new URLSearchParams({ locale: targetLocale, q: targetSlug });
      const res = await fetch(`/api/admin/pages?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return null;
      const pages = Array.isArray(data?.pages) ? data.pages as Array<{ id: string; slug: string; locale: string }> : [];
      const match = pages.find((p) => p.slug === targetSlug && p.locale === targetLocale);
      return match?.id ?? null;
    } catch {
      return null;
    }
  }

  async function switchLocale(target: string) {
    if (!slug) { setLocale(target); setCreatingForLocale(true); return; }
    const otherId = await findPageIdBySlugLocale(slug, target);
    if (otherId) {
      // Load other locale page without navigating
      setCurrentId(otherId);
      await load(otherId);
      await loadVersions(otherId);
    } else {
      setLocale(target);
      setCreatingForLocale(true);
      setVersions([]);
    }
  }

  async function loadVersions(targetId: string = currentId) {
    setLoadingVersions(true);
    setVersionsError(null);
    try {
      const res = await fetch(`/api/admin/pages/${targetId}/versions`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load versions failed");
      setVersions((data.versions || []).map((v: any) => ({ ...v, createdAt: v.createdAt })));
    } catch (e: any) {
      setVersionsError(e.message || "Failed to load versions");
    } finally {
      setLoadingVersions(false);
    }
  }

  // Load slug suggestions
  useEffect(() => {
    let aborted = false;
    fetch("/api/admin/pages/slugs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!aborted && Array.isArray(d?.slugs)) setSlugOptions(d.slugs); })
      .catch(() => {});
    return () => { aborted = true; };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let blocks: unknown = undefined;
      setBlocksError(null);
      setBlocksValidationErrors([]);
      if (blocksText.trim()) {
        try {
          blocks = JSON.parse(blocksText);
          if (!Array.isArray(blocks)) throw new Error("Blocks must be an array");
          const res = validateBlocks(blocks);
          if (!res.valid) {
            setBlocksValidationErrors(res.errors);
            setSaving(false);
            return;
          }
        } catch (e: any) {
          setBlocksError(e.message || "Invalid blocks JSON");
          setSaving(false);
          return;
        }
      }
      let res: Response;
      if (creatingForLocale) {
        // Create new page for this locale
        res = await fetch(`/api/admin/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, locale, title, excerpt, bodyMarkdown: body, blocks, published }),
        });
      } else {
        // Update current page
        res = await fetch(`/api/admin/pages/${currentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, locale, title, excerpt, bodyMarkdown: body, blocks, published }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (creatingForLocale && data?.id) {
        setCreatingForLocale(false);
        setCurrentId(data.id);
        await load(data.id);
        await loadVersions(data.id);
        return; // stay on page editor
      }
      await loadVersions(currentId);
      router.push("/admin/navigation");
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    setPublished(true);
    // Reuse onSave logic with published=true
  }

  async function onSaveDraft() {
    setPublished(false);
    // Reuse onSave logic with published=false
  }

  async function onDelete() {
    if (!confirm("Delete this page?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pages/${currentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      router.push("/admin/navigation");
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const preview = useMemo(() => body, [body]);
  const blocksPreview = useMemo(() => {
    if (!blocksText.trim()) return null;
    try {
      const parsed = JSON.parse(blocksText);
      if (!Array.isArray(parsed)) return null;
      const res = validateBlocks(parsed);
      if (!res.valid) return (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          Invalid blocks:
          <ul className="mt-1 list-disc pl-5">
            {res.errors.map((e, i) => (<li key={i}>{e}</li>))}
          </ul>
        </div>
      );
      return renderBlocks(res.normalized, { /* locale unknown in editor; show default */ });
    } catch {
      return null;
    }
  }, [blocksText]);

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
              {useCustomSlug ? (
                <input required className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} />
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
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-slate-700 dark:text-slate-200">Locale</span>
              {/* Hover reveal: show only active locale by default, both on hover */}
              <div className="group relative inline-flex rounded border border-slate-300 p-0.5 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => void switchLocale("bg")}
                  className={`px-3 py-1 text-sm transition ${locale === "bg" ? "bg-blue-600 text-white" : "hidden group-hover:block text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                  aria-pressed={locale === "bg"}
                >BG</button>
                <button
                  type="button"
                  onClick={() => void switchLocale("en")}
                  className={`px-3 py-1 text-sm transition ${locale === "en" ? "bg-blue-600 text-white" : "hidden group-hover:block text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                  aria-pressed={locale === "en"}
                >EN</button>
              </div>
              {creatingForLocale && (
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">No page exists for this locale yet. Saving will create it.</span>
              )}
            </div>
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
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">Blocks</span>
                <div className="ml-2 rounded border border-slate-300 p-0.5 dark:border-slate-600">
                  <button type="button" className={`px-2 py-0.5 ${useVisualBlocksEditor ? "bg-blue-600 text-white" : ""}`} onClick={() => setUseVisualBlocksEditor(true)}>Visual</button>
                  <button type="button" className={`px-2 py-0.5 ${!useVisualBlocksEditor ? "bg-blue-600 text-white" : ""}`} onClick={() => setUseVisualBlocksEditor(false)}>JSON</button>
                </div>
              </div>
              {useVisualBlocksEditor ? (
                <BlockEditor value={blocksText} onChange={setBlocksText} />
              ) : (
                <textarea className="min-h-[160px] w-full rounded border border-slate-300 px-2 py-1 font-mono dark:border-slate-600" value={blocksText} onChange={(e) => setBlocksText(e.target.value)} placeholder='[
  { "type": "Hero", "props": { "heading": "Welcome" } },
  { "type": "Markdown", "props": { "value": "**Hello**" } }
]'
                />
              )}
              {blocksError && <span className="text-xs text-red-600">{blocksError}</span>}
              {blocksValidationErrors.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-red-600">
                  {blocksValidationErrors.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span className="text-slate-700 dark:text-slate-200">Published</span>
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Save</button>
              <button type="button" disabled={saving} onClick={onSaveDraft} className="rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">Save draft</button>
              <button type="button" disabled={saving} onClick={onPublish} className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Publish</button>
              <button type="button" disabled={deleting} onClick={onDelete} className="rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30">Delete</button>
            </div>
          </form>
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Preview</h3>
            {blocksPreview}
            <div className="prose prose-slate max-w-none dark:prose-invert">
              <ReactMarkdown>{preview}</ReactMarkdown>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Versions</h3>
            {loadingVersions ? (
              <p className="text-sm text-slate-500">Loading versions…</p>
            ) : versionsError ? (
              <p className="text-sm text-red-600">{versionsError}</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-slate-500">No versions yet.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">Version</th>
                    <th className="px-3 py-2">Published</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-3 py-2">v{v.version}</td>
                      <td className="px-3 py-2">{v.published ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">{new Date(v.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <button
                          className="rounded border px-2 py-1 text-xs dark:border-slate-600"
                          onClick={async () => {
                            if (!confirm(`Restore version v${v.version}? This will publish it.`)) return;
                            setSaving(true);
                            try {
                              const res = await fetch(`/api/admin/pages/${currentId}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: v.id }) });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "Restore failed");
                              await loadVersions(currentId);
                            } catch (e: any) {
                              setError(e.message || "Restore failed");
                            } finally {
                              setSaving(false);
                            }
                          }}
                        >Restore</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
