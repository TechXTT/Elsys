"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Save,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Globe,
  ChevronLeft,
  X,
  History,
  Settings,
  Layers,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { validateBlocks } from "@/lib/blocks/registry";
import PageBuilder from "@/app/admin/components/page-builder";

type PageDto = {
  id: string;
  slug: string;
  locale: string;
  groupId?: string | null;
  title: string;
  excerpt?: string | null;
  bodyMarkdown?: string | null;
  blocks?: Array<{ type: string; props?: Record<string, unknown> | null }>;
  published: boolean;
};

type PageVersion = {
  id: string;
  version: number;
  published: boolean;
  createdAt: string;
  createdById?: string | null;
};

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;
  const [currentId, setCurrentId] = useState<string>(id);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Page data
  const [originalData, setOriginalData] = useState<PageDto | null>(null);
  const [slug, setSlug] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [slugOptions, setSlugOptions] = useState<string[]>([]);
  const [locale, setLocale] = useState("bg");
  const [creatingForLocale, setCreatingForLocale] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [blocks, setBlocks] = useState<Array<{ type: string; props: Record<string, unknown> }>>([]);
  const [published, setPublished] = useState(true);

  // Versions
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"builder" | "content" | "settings">("builder");
  const [showPreview, setShowPreview] = useState(false);

  // Track changes
  const hasChanges = useMemo(() => {
    if (!originalData) return false;
    return (
      title !== originalData.title ||
      excerpt !== (originalData.excerpt ?? "") ||
      body !== (originalData.bodyMarkdown ?? "") ||
      published !== originalData.published ||
      JSON.stringify(blocks) !== JSON.stringify(originalData.blocks ?? [])
    );
  }, [originalData, title, excerpt, body, published, blocks]);

  // Load page data
  async function load(targetId: string = currentId) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages/${targetId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      
      const p: PageDto = data.page;
      setOriginalData(p);
      setSlug(p.slug);
      setGroupId(p.groupId ?? null);
      setLocale(p.locale);
      setTitle(p.title);
      setExcerpt(p.excerpt ?? "");
      setBody(p.bodyMarkdown ?? "");
      setBlocks(p.blocks?.map(b => ({ type: b.type, props: b.props ?? {} })) ?? []);
      setPublished(p.published);
      setCreatingForLocale(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  // Load versions
  async function loadVersions(targetId: string = currentId) {
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/admin/pages/${targetId}/versions`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load versions failed");
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }

  // Load slug suggestions
  useEffect(() => {
    fetch("/api/admin/pages/slugs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.slugs)) setSlugOptions(d.slugs); })
      .catch(() => {});
  }, []);

  // Initial load
  useEffect(() => {
    if (id) {
      setCurrentId(id);
      void load(id);
      void loadVersions(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Find page by groupId and locale (pages with same groupId are translations of each other)
  async function findPageByGroupIdAndLocale(targetGroupId: string | null, targetLocale: string): Promise<string | null> {
    if (!targetGroupId) return null;
    try {
      const searchParams = new URLSearchParams({ locale: targetLocale, groupId: targetGroupId });
      const res = await fetch(`/api/admin/pages?${searchParams.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return null;
      const pages = Array.isArray(data?.pages) ? data.pages : [];
      // Should return exactly one match with same groupId in the target locale
      return pages.length > 0 ? pages[0].id : null;
    } catch {
      return null;
    }
  }

  // Switch locale
  async function switchLocale(target: string) {
    if (!groupId) {
      // No groupId means this page has no translations yet
      setLocale(target);
      setCreatingForLocale(true);
      return;
    }
    const otherId = await findPageByGroupIdAndLocale(groupId, target);
    if (otherId) {
      setCurrentId(otherId);
      await load(otherId);
      await loadVersions(otherId);
    } else {
      setLocale(target);
      setCreatingForLocale(true);
      setVersions([]);
    }
  }

  // Save page
  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      // Validate blocks if any
      if (blocks.length > 0) {
        const res = validateBlocks(blocks);
        if (!res.valid) {
          throw new Error(`Block validation failed: ${res.errors.join(", ")}`);
        }
      }

      let res: Response;
      if (creatingForLocale) {
        res = await fetch(`/api/admin/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, locale, title, excerpt, bodyMarkdown: body, blocks, published }),
        });
      } else {
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
      } else {
        await load(currentId);
        await loadVersions(currentId);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Delete page
  async function onDelete() {
    if (!confirm("Are you sure you want to delete this page? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pages/${currentId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      router.push("/admin/navigation");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  // Restore version
  async function restoreVersion(versionId: string, versionNumber: number) {
    if (!confirm(`Restore version v${versionNumber}? This will publish it as the current version.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pages/${currentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      await load(currentId);
      await loadVersions(currentId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setSaving(false);
    }
  }

  // Handle blocks change from PageBuilder
  const handleBlocksChange = useCallback((newBlocks: Array<{ type: string; props: Record<string, unknown> }>) => {
    setBlocks(newBlocks);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-2 text-sm text-slate-500">Loading page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-8 lg:-mx-48 flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/navigation"
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {creatingForLocale ? `New ${locale.toUpperCase()} version` : title || "Untitled Page"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
                /{locale}/{slug}
              </code>
              {hasChanges && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  Unsaved
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Locale switcher */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => switchLocale("bg")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                locale === "bg"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              BG
            </button>
            <button
              onClick={() => switchLocale("en")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                locale === "en"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              EN
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Preview button */}
          <a
            href={`/${locale}/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ExternalLink className="h-4 w-4" />
            Preview
          </a>

          {/* Delete button */}
          <button
            onClick={onDelete}
            disabled={deleting || creatingForLocale}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>

          {/* Save button */}
          <button
            onClick={onSave}
            disabled={saving || (!hasChanges && !creatingForLocale)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {creatingForLocale ? "Create" : "Save"}
              </>
            )}
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-6 py-3 dark:border-red-800 dark:bg-red-950/30">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto rounded p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Creating for locale notice */}
      {creatingForLocale && (
        <div className="flex items-center gap-3 border-b border-blue-200 bg-blue-50 px-6 py-3 dark:border-blue-800 dark:bg-blue-950/30">
          <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Creating new {locale.toUpperCase()} version for this page. Fill in the content and save to create.
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-6 dark:border-slate-700 dark:bg-slate-900">
        <button
          onClick={() => setActiveTab("builder")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "builder"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Layers className="h-4 w-4" />
          Page Builder
        </button>
        <button
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "content"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          Content
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "settings"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>

        {/* Version history toggle */}
        <button
          onClick={() => setShowVersions(!showVersions)}
          className={`ml-auto flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            showVersions
              ? "text-brand-600 dark:text-brand-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <History className="h-4 w-4" />
          History
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
            {versions.length}
          </span>
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main panel */}
        <div className="flex-1 overflow-auto">
          {activeTab === "builder" && (
            <div className="h-full w-full">
              <PageBuilder
                initialBlocks={blocks}
                onChange={handleBlocksChange}
                onSave={onSave}
                isSaving={saving}
                hasChanges={hasChanges}
              />
            </div>
          )}

          {activeTab === "content" && (
            <div className="mx-auto max-w-3xl space-y-6 p-6">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Page Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter page title..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-lg font-medium placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Excerpt / Description
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="A brief description for SEO and previews..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Body markdown */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Body Content (Markdown)
                  </label>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-500"
                  >
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPreview ? "Edit" : "Preview"}
                  </button>
                </div>
                {showPreview ? (
                  <div className="min-h-[300px] rounded-lg border border-slate-300 bg-white p-6 dark:border-slate-600 dark:bg-slate-800">
                    <div className="prose prose-slate max-w-none dark:prose-invert">
                      <ReactMarkdown>{body}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your content in Markdown..."
                    rows={12}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="mx-auto max-w-2xl space-y-6 p-6">
              {/* Slug */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">URL Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Page Slug
                    </label>
                    {useCustomSlug ? (
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="my-page-slug"
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    ) : (
                      <select
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">Select a slug...</option>
                        {slugOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useCustomSlug}
                      onChange={(e) => setUseCustomSlug(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-slate-600 dark:text-slate-400">Use custom slug</span>
                  </label>

                  <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Full URL: <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs dark:bg-slate-700">/{locale}/{slug}</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Publishing */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Publishing</h3>
                
                <label className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-brand-600 peer-focus:ring-2 peer-focus:ring-brand-500/20 dark:bg-slate-600" />
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {published ? "Published" : "Draft"}
                    </span>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {published ? "This page is visible to the public" : "This page is hidden from the public"}
                    </p>
                  </div>
                </label>
              </div>

              {/* Danger zone */}
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 dark:border-red-800 dark:bg-red-950/20">
                <h3 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
                <p className="mb-4 text-sm text-red-600 dark:text-red-300">
                  Deleting this page will remove all versions and cannot be undone.
                </p>
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Page
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Version history panel */}
        {showVersions && (
          <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-4 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Version History</h3>
                <button
                  onClick={() => setShowVersions(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {loadingVersions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center">
                <History className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500">No versions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">v{v.version}</span>
                        {v.published && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            Published
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(v.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => restoreVersion(v.id, v.version)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
