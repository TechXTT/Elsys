"use client";

import React, { useCallback, useEffect, useMemo, useState, DragEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { locales as supportedLocales, defaultLocale } from "@/i18n/config";
import {
  Plus,
  Save,
  RotateCcw,
  GripVertical,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  ExternalLink,
  Trash2,
  ArrowUp,
  ArrowDown,
  Folder,
  FileText,
  Link2,
  Route,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";

type PageNode = {
  id: string;
  parentId: string | null;
  order: number;
  slug: string | null;
  externalUrl: string | null;
  routePath?: string | null;
  routeOverride?: string | null;
  visible: boolean;
  accessRole: string | null;
  navLabel: string | null;
  kind: string; // PAGE | LINK | FOLDER | ROUTE
  locale?: string;
  idsByLocale?: Record<string, string>;
  slugByLocale?: Record<string, string | null>;
  labelByLocale?: Record<string, string | null>;
  routeOverrideByLocale?: Record<string, string | null>;
  routePathByLocale?: Record<string, string | null>;
  externalUrlByLocale?: Record<string, string | null>;
  children: PageNode[];
};

type DropMode = "inside" | "above" | "below";

const NAV_LOCALES = Array.from(supportedLocales);
const PRIMARY_LOCALE = defaultLocale && NAV_LOCALES.includes(defaultLocale)
  ? defaultLocale
  : (NAV_LOCALES[0] ?? "bg");

export default function NavigationAdminPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<string>(PRIMARY_LOCALE);
  const [tree, setTree] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropMode, setDropMode] = useState<DropMode>("inside");
  const [pending, setPending] = useState<Record<string, Partial<PageNode>>>({});
  const [saving, setSaving] = useState(false);

  const [newParent, setNewParent] = useState<string>("");
  const [newSlug, setNewSlug] = useState<Record<string, string>>({ bg: "", en: "" });
  const [newExternal, setNewExternal] = useState<Record<string, string>>({ bg: "", en: "" });
  const [newRoutePath, setNewRoutePath] = useState<Record<string, string>>({ bg: "", en: "" });
  const [newRouteSlug, setNewRouteSlug] = useState<Record<string, string>>({ bg: "", en: "" });
  const [newRouteOverride, setNewRouteOverride] = useState<Record<string, string>>({ bg: "", en: "" });
  const [newNavLabel, setNewNavLabel] = useState<Record<string, string>>({ bg: "", en: "" });
  const [newKind, setNewKind] = useState<string>("PAGE");

  const pendingBufferRef = useRef<Record<string, Partial<PageNode>>>({});
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function queuePending(id: string, patch: Partial<PageNode>, debounceMs = 0) {
    if (debounceMs === 0) {
      setPending((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
      return;
    }
    pendingBufferRef.current[id] = { ...(pendingBufferRef.current[id] || {}), ...patch };
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(() => {
      setPending((prev) => {
        const next = { ...prev };
        for (const [pid, pp] of Object.entries(pendingBufferRef.current)) {
          next[pid] = { ...(next[pid] || {}), ...pp };
        }
        return next;
      });
      pendingBufferRef.current = {};
      pendingTimerRef.current = null;
    }, debounceMs);
  }

  const [treesByLocale, setTreesByLocale] = useState<Record<string, PageNode[]>>({});
  const currentLocaleRef = useRef(locale);
  useEffect(() => { currentLocaleRef.current = locale; }, [locale]);

  const load = useCallback(async (targetLocale?: string) => {
    const initialLocale = targetLocale ?? currentLocaleRef.current;
    setLoading(true);
    setError(null);
    try {
      const fetches = NAV_LOCALES.map(async (loc) => {
        const res = await fetch(`/api/admin/navigation?locale=${encodeURIComponent(loc)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Load failed for ${loc}`);
        return { locale: loc, items: data.items as PageNode[] };
      });
      const results = await Promise.all(fetches);
      const byLocale: Record<string, PageNode[]> = {};
      results.forEach((r) => { byLocale[r.locale] = r.items; });
      setTreesByLocale(byLocale);
      setTree(byLocale[initialLocale] || []);
    } catch (e: any) {
      setError(e.message || "Failed to load navigation");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(locale); }, []);

  const flat = useMemo(() => {
    const out: PageNode[] = [];
    function walk(list: PageNode[]) { list.forEach(n => { out.push(n); walk(n.children); }); }
    walk(tree);
    return out;
  }, [tree]);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload: any = {
        parentId: newParent || null,
        slugByLocale: Object.fromEntries(NAV_LOCALES.map((code) => [code, newSlug[code] || null])),
        externalByLocale: Object.fromEntries(NAV_LOCALES.map((code) => [code, newExternal[code] || null])),
        routePathByLocale: Object.fromEntries(NAV_LOCALES.map((code) => [code, newRoutePath[code] || null])),
        routeSlugByLocale: Object.fromEntries(NAV_LOCALES.map((code) => [code, newRouteSlug[code] || null])),
        routeOverrideByLocale: Object.fromEntries(NAV_LOCALES.map((code) => [code, newRouteOverride[code] || null])),
        navLabelByLocale: Object.fromEntries(NAV_LOCALES.map((code) => [code, newNavLabel[code] || null])),
        kind: newKind,
        visible: true,
      };
      const res = await fetch('/api/admin/navigation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setNewParent('');
      setNewSlug({ bg: "", en: "" });
      setNewExternal({ bg: "", en: "" });
      setNewRoutePath({ bg: "", en: "" });
      setNewRouteSlug({ bg: "", en: "" });
      setNewRouteOverride({ bg: "", en: "" });
      setNewNavLabel({ bg: "", en: "" });
      setNewKind('PAGE');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to create');
    } finally { setCreating(false); }
  }

  function deepClone(n: PageNode): PageNode {
    return { ...n, children: n.children.map(deepClone) };
  }
  function findNode(list: PageNode[], id: string): PageNode | null {
    for (const n of list) { if (n.id === id) return n; const f = findNode(n.children, id); if (f) return f; }
    return null;
  }
  function removeNode(list: PageNode[], id: string): PageNode | null {
    for (let i=0;i<list.length;i++) { const n=list[i]; if (n.id===id){ list.splice(i,1); return n; } const r=removeNode(n.children,id); if(r) return r; }
    return null;
  }
  function normalize(list: PageNode[]) {
    list.sort((a,b)=>a.order-b.order); list.forEach((c,i)=>{ c.order=i; normalize(c.children); });
  }

  // Find a node by its id or by groupId match (for cross-locale lookups)
  function findNodeByIdOrGroup(list: PageNode[], id: string, groupId?: string | null): PageNode | null {
    for (const n of list) {
      if (n.id === id) return n;
      if (groupId && n.idsByLocale) {
        // Check if any locale id matches
        for (const locId of Object.values(n.idsByLocale)) {
          if (locId === id) return n;
        }
      }
      const f = findNodeByIdOrGroup(n.children, id, groupId);
      if (f) return f;
    }
    return null;
  }

  // For structural changes across locales, we need to find the equivalent node by groupId
  function findNodeInLocaleTree(sourceTree: PageNode[], targetTree: PageNode[], sourceId: string): PageNode | null {
    // First find the source node to get its groupId info
    const sourceNode = findNode(sourceTree, sourceId);
    if (!sourceNode) return null;
    
    // Find equivalent in target tree by checking idsByLocale
    function searchByGroup(nodes: PageNode[]): PageNode | null {
      for (const n of nodes) {
        // Check if this node's idsByLocale contains sourceId (meaning same group)
        if (n.idsByLocale) {
          for (const locId of Object.values(n.idsByLocale)) {
            if (locId === sourceId) return n;
          }
        }
        // Also check if this is the same node
        if (n.id === sourceId) return n;
        const found = searchByGroup(n.children);
        if (found) return found;
      }
      return null;
    }
    return searchByGroup(targetTree);
  }

  function applyUpdateToTree(source: PageNode[], id: string, patch: Partial<PageNode>, referenceTree?: PageNode[]): PageNode[] {
    const clone = source.map(deepClone);
    const structural = 'parentId' in patch || 'order' in patch;
    if (!structural) {
      // Apply shallow patch to the matched node OR locale-specific id
      function apply(nodes: PageNode[]): boolean {
        for (const node of nodes) {
          if (node.id === id) {
            Object.assign(node, patch);
            // Also sync aggregated maps if patch contains localized fields
            const baseLocale = node.locale ?? PRIMARY_LOCALE;
            if ('navLabel' in patch) {
              const value = (patch.navLabel ?? null) as string | null;
              node.labelByLocale = { ...(node.labelByLocale || {}), [baseLocale]: value };
              node.navLabel = value;
            }
            if ('slug' in patch) {
              const value = (patch.slug ?? null) as string | null;
              node.slugByLocale = { ...(node.slugByLocale || {}), [baseLocale]: value };
              node.slug = value;
            }
            if ('routeOverride' in patch) {
              const value = (patch.routeOverride ?? null) as string | null;
              node.routeOverrideByLocale = { ...(node.routeOverrideByLocale || {}), [baseLocale]: value };
              node.routeOverride = value;
            }
            if ('routePath' in patch) {
              const value = (patch.routePath ?? null) as string | null;
              node.routePathByLocale = { ...(node.routePathByLocale || {}), [baseLocale]: value };
              node.routePath = value;
            }
            if ('externalUrl' in patch) {
              const value = (patch.externalUrl ?? null) as string | null;
              node.externalUrlByLocale = { ...(node.externalUrlByLocale || {}), [baseLocale]: value };
              node.externalUrl = value;
            }
            return true;
          }
          // attempt locale match
          if (node.idsByLocale) {
            for (const [loc, locId] of Object.entries(node.idsByLocale)) {
              if (locId === id) {
                const baseLocale = node.locale ?? PRIMARY_LOCALE;
                if ('navLabel' in patch) {
                  const value = (patch.navLabel ?? null) as string | null;
                  node.labelByLocale = { ...(node.labelByLocale || {}), [loc]: value };
                  if (loc === baseLocale) node.navLabel = value;
                }
                if ('slug' in patch) {
                  const value = (patch.slug ?? null) as string | null;
                  node.slugByLocale = { ...(node.slugByLocale || {}), [loc]: value };
                  if (loc === baseLocale) node.slug = value;
                }
                if ('routeOverride' in patch) {
                  const value = (patch.routeOverride ?? null) as string | null;
                  node.routeOverrideByLocale = { ...(node.routeOverrideByLocale || {}), [loc]: value };
                  if (loc === baseLocale) node.routeOverride = value;
                }
                if ('routePath' in patch) {
                  const value = (patch.routePath ?? null) as string | null;
                  node.routePathByLocale = { ...(node.routePathByLocale || {}), [loc]: value };
                  if (loc === baseLocale) node.routePath = value;
                }
                if ('externalUrl' in patch) {
                  const value = (patch.externalUrl ?? null) as string | null;
                  node.externalUrlByLocale = { ...(node.externalUrlByLocale || {}), [loc]: value };
                  if (loc === baseLocale) node.externalUrl = value;
                }
                return true;
              }
            }
          }
          if (apply(node.children)) return true;
        }
        return false;
      }
      apply(clone);
      return clone;
    }
    
    // For structural changes, find the node by id or by idsByLocale (cross-locale sync)
    function findNodeByIdOrLocaleId(nodes: PageNode[], targetId: string): PageNode | null {
      for (const n of nodes) {
        if (n.id === targetId) return n;
        // Check if this node's idsByLocale contains the target id
        if (n.idsByLocale) {
          for (const locId of Object.values(n.idsByLocale)) {
            if (locId === targetId) return n;
          }
        }
        const found = findNodeByIdOrLocaleId(n.children, targetId);
        if (found) return found;
      }
      return null;
    }
    
    function removeNodeByIdOrLocaleId(nodes: PageNode[], targetId: string): PageNode | null {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.id === targetId) {
          nodes.splice(i, 1);
          return n;
        }
        if (n.idsByLocale) {
          for (const locId of Object.values(n.idsByLocale)) {
            if (locId === targetId) {
              nodes.splice(i, 1);
              return n;
            }
          }
        }
        const found = removeNodeByIdOrLocaleId(n.children, targetId);
        if (found) return found;
      }
      return null;
    }
    
    const removed = removeNodeByIdOrLocaleId(clone, id);
    if (!removed) return clone;
    
    // Apply order change
    if ('order' in patch) {
      removed.order = patch.order as number;
    }
    
    // Handle parentId change - need to find corresponding parent in this locale tree
    let targetParentId = removed.parentId;
    if ('parentId' in patch) {
      const newParentId = patch.parentId;
      if (newParentId === null) {
        targetParentId = null;
      } else if (newParentId) {
        // Find the parent by id or idsByLocale
        const parentInTree = findNodeByIdOrLocaleId(clone, newParentId);
        targetParentId = parentInTree?.id ?? null;
      }
      removed.parentId = targetParentId;
    }
    
    if (targetParentId) {
      const parentNode = findNode(clone, targetParentId);
      (parentNode ? parentNode.children : clone).push(removed);
    } else {
      clone.push(removed);
    }
    normalize(clone);
    return clone;
  }

  function update(id: string, patch: Partial<PageNode>) {
    // Queue as pending change
    queuePending(id, patch);

    const structural = 'parentId' in patch || 'order' in patch;

    // Optimistic update for current locale view
    setTree(prev => applyUpdateToTree(prev, id, patch));

    // Keep cached locale trees in sync so structure stays 1:1 before saving
    setTreesByLocale(prev => {
      if (structural) {
        const next: Record<string, PageNode[]> = {};
        for (const [loc, list] of Object.entries(prev)) {
          next[loc] = applyUpdateToTree(list, id, patch);
        }
        // Ensure current locale entry exists even if prev lacked it
        if (!next[locale]) next[locale] = applyUpdateToTree(tree, id, patch);
        return next;
      }
      return { ...prev, [locale]: applyUpdateToTree(prev[locale] || tree, id, patch) };
    });
  }

  async function saveAll() {
    if (!Object.keys(pending).length) return;
    setSaving(true);
    setError(null);
    try {
      const entries = Object.entries(pending);
      const results = await Promise.allSettled(entries.map(async ([id, patch]) => {
        const res = await fetch(`/api/admin/navigation/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Save failed for ${id}`);
      }));
      const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (errors.length) {
        const msg = errors.map(e => (e.reason as any)?.message || 'Save failed').join('; ');
        setError(msg);
        return;
      }
      setPending({});
      await load(locale);
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function discardAll() {
    setPending({});
    await load(locale);
  }

  async function remove(id: string) {
    if (!confirm('Delete this item and its descendants?')) return;
    const res = await fetch(`/api/admin/navigation/${id}`, { method: 'DELETE' });
    if (!res.ok) { setError('Delete failed'); return; }
    await load(locale);
  }

  function buildHierarchicalSlug(node: PageNode, tree: PageNode[], loc?: string): string {
    const path: string[] = [];
    let cur: PageNode | null = node;
    function getById(id: string | null): PageNode | null { 
      if (!id) return null; 
      return findNode(tree, id); 
    }
    while (cur) {
      const seg = loc ? (cur.slugByLocale?.[loc] ?? cur.slug) : (cur.slug ?? null);
      if (seg) path.unshift(seg);
      cur = getById(cur.parentId);
    }
    return path.join('/');
  }

  function handleLocaleSwitch(next: string) {
    if (next === locale) return;
    setTreesByLocale((prev) => {
      const updated = { ...prev, [locale]: tree };
      setTree(updated[next] || []);
      return updated;
    });
    setLocale(next);
  }

  // Keyboard shortcut Cmd/Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveAll();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, saving]);

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pages & Navigation</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your site's page hierarchy and navigation structure
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Locale Switcher */}
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-slate-400" />
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              {(["bg", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleLocaleSwitch(code)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium uppercase transition-colors ${
                    locale === code
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Action Buttons */}
          <button
            onClick={discardAll}
            disabled={!pendingCount || saving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            Discard
          </button>
          <button
            onClick={saveAll}
            disabled={!pendingCount || saving}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save"}
            {pendingCount > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
            <p className="mt-2 text-sm text-slate-500">Loading navigation...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Navigation Tree */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Navigation Tree
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    ({flat.length} items)
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Drag items to reorder • {locale.toUpperCase()} locale
                </p>
              </div>
            </div>
            <div className="p-4">
              <NavTree
                nodes={tree}
                fullTree={tree}
                flatNodes={flat}
                parentId={null}
                draggingId={draggingId}
                dropTargetId={dropTargetId}
                dropMode={dropMode}
                setDraggingId={setDraggingId}
                setDropTargetId={setDropTargetId}
                setDropMode={setDropMode}
                onUpdate={update}
                onDelete={remove}
                locale={locale}
                buildHierarchicalSlug={buildHierarchicalSlug}
              />
            </div>
          </section>

          {/* Create New Item */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Plus className="h-4 w-4" />
                Create New Item
              </h2>
            </div>
            <form onSubmit={createItem} className="p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Parent & Kind */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Parent
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    value={newParent}
                    onChange={(e) => setNewParent(e.target.value)}
                  >
                    <option value="">(Root level)</option>
                    {flat.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.navLabel || p.slug || p.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Type
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value)}
                  >
                    <option value="PAGE">📄 Page</option>
                    <option value="FOLDER">📁 Folder</option>
                    <option value="LINK">🔗 External Link</option>
                    <option value="ROUTE">🛤️ Dynamic Route</option>
                  </select>
                </div>

                {/* Locale-specific fields */}
                {NAV_LOCALES.map((code: string) => (
                  <div key={`segment-${code}`}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {code.toUpperCase()}{" "}
                      {newKind === "LINK" ? "URL" : newKind === "ROUTE" ? "Route Path" : "Slug"}
                    </label>
                    <input
                      disabled={newKind === "LINK"}
                      value={newKind === "ROUTE" ? newRoutePath[code] : newSlug[code]}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (newKind === "ROUTE") {
                          setNewRoutePath((prev) => ({ ...prev, [code]: val }));
                        } else {
                          setNewSlug((prev) => ({ ...prev, [code]: val }));
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      placeholder={newKind === "ROUTE" ? "pages/news" : "e.g. about-us"}
                    />
                  </div>
                ))}
              </div>

              {/* Additional fields row */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {NAV_LOCALES.map((code) => (
                  <div key={`label-${code}`}>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {code.toUpperCase()} Label
                    </label>
                    <input
                      value={newNavLabel[code]}
                      onChange={(e) => setNewNavLabel((prev) => ({ ...prev, [code]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      placeholder="Display name"
                    />
                  </div>
                ))}

                {newKind === "LINK" &&
                  NAV_LOCALES.map((code) => (
                    <div key={`external-${code}`}>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {code.toUpperCase()} URL
                      </label>
                      <input
                        value={newExternal[code]}
                        onChange={(e) => setNewExternal((prev) => ({ ...prev, [code]: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        placeholder="https://..."
                      />
                    </div>
                  ))}
              </div>

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {creating ? "Creating..." : "Create Item"}
                </button>
              </div>
            </form>
          </section>
        </>
      )}

      {/* Floating Save Button */}
      {pendingCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-xl disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {pendingCount}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function NavTree({ nodes, fullTree, flatNodes, parentId, draggingId, dropTargetId, dropMode, setDraggingId, setDropTargetId, setDropMode, onUpdate, onDelete, locale, buildHierarchicalSlug }: {
  nodes: PageNode[];
  fullTree: PageNode[];
  flatNodes: PageNode[];
  parentId: string | null;
  draggingId: string | null;
  dropTargetId: string | null;
  dropMode: DropMode;
  setDraggingId: (id: string | null) => void;
  setDropTargetId: (id: string | null) => void;
  setDropMode: (m: DropMode) => void;
  onUpdate: (id: string, patch: Partial<PageNode>) => void;
  onDelete: (id: string) => void;
  locale: string;
  buildHierarchicalSlug: (n: PageNode, tree: PageNode[], loc?: string) => string;
}) {
  const dragImgRef = useRef<HTMLElement | null>(null);

  function findNode(list: PageNode[], id: string): PageNode | null {
    for (const n of list) {
      if (n.id === id) return n;
      const f = findNode(n.children, id);
      if (f) return f;
    }
    return null;
  }

  function getChildrenOf(pid: string | null): PageNode[] {
    if (pid == null) return fullTree;
    const p = findNode(fullTree, pid);
    return p?.children || [];
  }

  function onDragStart(e: DragEvent<HTMLDivElement>, id: string, dragEl?: HTMLElement | null) {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    }
    setDraggingId(id);

    if (e.dataTransfer && dragEl) {
      const rect = dragEl.getBoundingClientRect();
      const clone = dragEl.cloneNode(true) as HTMLElement;
      clone.style.position = "fixed";
      clone.style.top = "-1000px";
      clone.style.left = "-1000px";
      clone.style.width = rect.width + "px";
      clone.style.opacity = "0.9";
      clone.style.pointerEvents = "none";
      document.body.appendChild(clone);
      dragImgRef.current = clone;
      try {
        e.dataTransfer.setDragImage(clone, Math.min(40, rect.width / 3), 16);
      } catch {}
    }
  }

  function onDrop() {
    if (!draggingId || !dropTargetId || draggingId === dropTargetId) {
      setDraggingId(null);
      setDropTargetId(null);
      if (dragImgRef.current) {
        try { document.body.removeChild(dragImgRef.current); } catch {}
        dragImgRef.current = null;
      }
      return;
    }

    const drag = findNode(fullTree, draggingId);
    if (!drag) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }

    // Handle new zone format: __INSERT_TOP__:parentId or __INSERT_AFTER__:nodeId
    if (dropTargetId.startsWith('__INSERT_TOP__:')) {
      const targetParentId = dropTargetId.replace('__INSERT_TOP__:', '');
      const newParentId = targetParentId === 'root' ? null : targetParentId;
      // Insert at top with order before all existing
      const siblings = getChildrenOf(newParentId);
      const minOrder = siblings.length > 0 ? Math.min(...siblings.map(s => s.order)) - 1 : 0;
      onUpdate(drag.id, { parentId: newParentId, order: minOrder });
    } else if (dropTargetId.startsWith('__INSERT_AFTER__:')) {
      const afterNodeId = dropTargetId.replace('__INSERT_AFTER__:', '');
      const afterNode = findNode(fullTree, afterNodeId);
      if (afterNode) {
        const siblings = getChildrenOf(afterNode.parentId ?? null);
        const sorted = [...siblings].sort((a, b) => a.order - b.order);
        const afterIdx = sorted.findIndex(s => s.id === afterNodeId);
        const before = sorted[afterIdx];
        const after = sorted[afterIdx + 1];
        let targetOrder: number;
        if (!after) {
          targetOrder = (before?.order ?? 0) + 1;
        } else {
          targetOrder = ((before?.order ?? 0) + (after.order ?? 0)) / 2;
        }
        onUpdate(drag.id, { parentId: afterNode.parentId ?? null, order: targetOrder });
      }
    } else {
      // Legacy: dropping on a node directly (inside mode)
      const over = findNode(fullTree, dropTargetId);
      if (over) {
        if (dropMode === "inside") {
          // Move as last child of target
          onUpdate(drag.id, { parentId: over.id, order: Number.MAX_SAFE_INTEGER });
        } else {
          // Reorder among siblings above/below the target
          const siblings = getChildrenOf(over.parentId ?? null);
          const sorted = [...siblings].sort((a, b) => a.order - b.order);
          const targetIndex = sorted.findIndex((s) => s.id === over.id);
          const insertIndex = dropMode === "below" ? targetIndex + 1 : targetIndex;
          const before = sorted[insertIndex - 1];
          const after = sorted[insertIndex];
          let targetOrder: number;
          if (!before && !after) {
            targetOrder = 0;
          } else if (!before && after) {
            targetOrder = (after.order ?? 0) - 1;
          } else if (before && !after) {
            targetOrder = (before.order ?? 0) + 1;
          } else {
            targetOrder = ((before!.order ?? 0) + (after!.order ?? 0)) / 2;
          }
          onUpdate(drag.id, { parentId: over.parentId ?? null, order: targetOrder });
        }
      }
    }

    setDraggingId(null);
    setDropTargetId(null);
    if (dragImgRef.current) {
      try { document.body.removeChild(dragImgRef.current); } catch {}
      dragImgRef.current = null;
    }
  }

  // Cancel drag on Escape at root
  React.useEffect(() => {
    if (parentId !== null) return;
    const cancel = () => {
      setDraggingId(null);
      setDropTargetId(null);
      if (dragImgRef.current) {
        try {
          document.body.removeChild(dragImgRef.current);
        } catch {}
        dragImgRef.current = null;
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
    };
  }, [parentId, setDraggingId, setDropTargetId]);

  // Drop zone between nodes: insertAfterNodeId is the node after which to insert (null = top of list)
  const renderDropZone = (insertAfterNodeId: string | null, active: boolean) => (
    <div
      className={`relative transition-all ${draggingId ? 'h-6' : 'h-1'}`}
      onDragOver={(e) => {
        e.preventDefault();
        // Use a special format to indicate insertion position
        setDropTargetId(insertAfterNodeId === null ? `__INSERT_TOP__:${parentId ?? 'root'}` : `__INSERT_AFTER__:${insertAfterNodeId}`);
        setDropMode("below");
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDropTargetId(insertAfterNodeId === null ? `__INSERT_TOP__:${parentId ?? 'root'}` : `__INSERT_AFTER__:${insertAfterNodeId}`);
        setDropMode("below");
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
    >
      <div
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-lg border-2 border-dashed transition-all ${
          active 
            ? "border-brand-500 bg-brand-50/70 opacity-100 h-8" 
            : draggingId 
              ? "border-slate-300 bg-slate-50/50 opacity-50 h-4 dark:border-slate-600 dark:bg-slate-800/50" 
              : "opacity-0 h-0"
        }`}
      />
    </div>
  );

  // Check if a zone is active
  const isZoneActive = (insertAfterNodeId: string | null) => {
    const zoneId = insertAfterNodeId === null ? `__INSERT_TOP__:${parentId ?? 'root'}` : `__INSERT_AFTER__:${insertAfterNodeId}`;
    return dropTargetId === zoneId;
  };

  return (
    <div className="relative">
      <ul className="space-y-0">
        {/* Top zone - insert at beginning */}
        {renderDropZone(null, isZoneActive(null))}
        {nodes.map((n, idx) => (
          <React.Fragment key={n.id}>
            <NavItem
              node={n}
              fullTree={fullTree}
              flatNodes={flatNodes}
              draggingId={draggingId}
              dropTargetId={dropTargetId}
              dropMode={dropMode}
              setDraggingId={setDraggingId}
              setDropTargetId={setDropTargetId}
              setDropMode={setDropMode}
              onDragStart={onDragStart}
              onDragOverItem={(id, mode, clientY) => {
                setDropTargetId(id);
                setDropMode(mode);
              }}
              onDrop={onDrop}
              onUpdate={onUpdate}
              onDelete={onDelete}
              locale={locale}
              buildHierarchicalSlug={buildHierarchicalSlug}
            />
            {/* Zone after this node (between this and next, or at bottom) */}
            {renderDropZone(n.id, isZoneActive(n.id))}
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
}

function NavItem({ node: n, fullTree, flatNodes, draggingId, dropTargetId, dropMode, setDraggingId, setDropTargetId, setDropMode, onDragStart, onDragOverItem, onDrop, onUpdate, onDelete, locale, buildHierarchicalSlug }: {
  node: PageNode; fullTree: PageNode[]; flatNodes: PageNode[]; draggingId: string | null; dropTargetId: string | null; dropMode: DropMode; setDraggingId: (id:string|null)=>void; setDropTargetId:(id:string|null)=>void; setDropMode:(m:DropMode)=>void; onDragStart:(e:DragEvent<HTMLDivElement>,id:string,el?:HTMLElement|null)=>void; onDragOverItem:(id:string,mode:DropMode, clientY: number | null)=>void; onDrop:()=>void; onUpdate:(id:string,patch:Partial<PageNode>)=>void; onDelete:(id:string)=>void; locale:string; buildHierarchicalSlug:(n:PageNode,t:PageNode[], loc?: string)=>string }) {
  const router = useRouter();
  const [expanded,setExpanded]=useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const liRef = useRef<HTMLLIElement|null>(null);
  const hasChildren = n.children.length>0;
  const siblings = n.parentId? (find(fullTree,n.parentId)?.children||[]) : fullTree;
  function find(list:PageNode[],id:string):PageNode|null{ for(const x of list){ if(x.id===id) return x; const f=find(x.children,id); if(f) return f; } return null; }
  const ordered = [...siblings].sort((a,b)=>a.order-b.order);
  const idx = ordered.findIndex(s=>s.id===n.id);
  const atTop = idx<=0; const atBottom = idx===ordered.length-1;
  const displayLabel = n.labelByLocale?.[locale] ?? n.navLabel ?? null;
  const displaySlug = n.slugByLocale?.[locale] ?? n.slug ?? null;
  const displayRouteOverride = n.routeOverrideByLocale?.[locale] ?? n.routeOverride ?? null;
  const displayRoutePath = n.routePathByLocale?.[locale] ?? n.routePath ?? null;
  const displayExternal = n.externalUrlByLocale?.[locale] ?? n.externalUrl ?? null;
  const parentNode = n.parentId ? find(fullTree, n.parentId) : null;
  async function moveUp(){ if(atTop) return; const prev=ordered[idx-1]; onUpdate(n.id,{order:prev.order}); onUpdate(prev.id,{order:n.order}); }
  async function moveDown(){ if(atBottom) return; const next=ordered[idx+1]; onUpdate(n.id,{order:next.order}); onUpdate(next.id,{order:n.order}); }
  function outdent(){
    if(!n.parentId) return;
    const grandParentId = parentNode?.parentId ?? null;
    onUpdate(n.id,{ parentId: grandParentId, order: Number.MAX_SAFE_INTEGER });
  }
  function hierarchical(){ return buildHierarchicalSlug(n, fullTree); }
  function preview(){
    const slug = (n.slugByLocale?.[locale] ?? n.slug);
    if(n.kind!=='PAGE'||!slug) return; const path=buildHierarchicalSlug(n, fullTree, locale); window.open(`/${locale}/${path}`,'_blank');
  }
  function edit(){ router.push(`/admin/pages/${n.id}`); }
  function onDragOver(e: DragEvent<HTMLLIElement>) {
    e.preventDefault();
    if (!liRef.current) {
      // If expanded with children, don't allow "inside" drop on parent - use children zones instead
      if (hasChildren && expanded) return;
      onDragOverItem(n.id, "inside", e.clientY);
      return;
    }
    const rect = liRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let mode: DropMode = "inside";
    if (y < rect.height * 0.25) mode = "above";
    else if (y > rect.height * 0.75) mode = "below";
    // If expanded with children, don't allow "inside" - only above/below the parent header
    if (hasChildren && expanded && mode === "inside") {
      mode = "below"; // Default to below if hovering middle of expanded parent
    }
    onDragOverItem(n.id, mode, e.clientY);
  }
  function onDragLeave() {
    onDragOverItem(n.id, "inside", null);
  }
  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  const kindIcon = n.kind === 'FOLDER' ? <Folder className="h-4 w-4" /> : n.kind === 'LINK' ? <Link2 className="h-4 w-4" /> : n.kind === 'ROUTE' ? <Route className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  const kindColor = n.kind === 'FOLDER' ? 'text-amber-600 dark:text-amber-400' : n.kind === 'LINK' ? 'text-purple-600 dark:text-purple-400' : n.kind === 'ROUTE' ? 'text-cyan-600 dark:text-cyan-400' : 'text-blue-600 dark:text-blue-400';
  const isDropTarget = dropTargetId === n.id;
  // Don't show "inside" highlight when expanded - use children zones instead
  const showInsideHighlight = isDropTarget && dropMode === "inside" && !(hasChildren && expanded);

  return (
    <li
      ref={liRef}
      className={`relative overflow-hidden rounded-xl border bg-white transition-all dark:bg-slate-900 ${
        showInsideHighlight
          ? "border-brand-400 ring-2 ring-brand-400/30"
          : "border-slate-200 dark:border-slate-700"
      } ${draggingId === n.id ? "opacity-40" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnter={onDragEnter}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
    >
      {dropTargetId === `__OUTDENT_AFTER_PARENT__:${n.id}` ? (
        <div className="flex items-center gap-2 bg-brand-50 px-4 py-2 text-xs text-brand-600 dark:bg-brand-950/30">
          <div className="h-0.5 flex-1 bg-brand-500" />
          <span className="shrink-0 font-medium">Outdent here</span>
        </div>
      ) : null}

      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Drag handle - this is the actual draggable element */}
        <div
          draggable={true}
          className="flex cursor-grab select-none items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700"
          onDragStart={(e: DragEvent<HTMLDivElement>) => {
            e.stopPropagation();
            onDragStart(e, n.id, liRef.current);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDropTargetId(null);
            setDropMode("inside");
          }}
        >
          <GripVertical className="h-4 w-4 pointer-events-none" />
        </div>

        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-7" />
        )}

        {/* Kind icon */}
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 ${kindColor}`}>
          {kindIcon}
        </div>

        {/* Label & path */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-slate-900 dark:text-white">
              {displayLabel || displaySlug || displayExternal || n.id}
            </span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              n.kind === 'FOLDER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
              n.kind === 'LINK' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
              n.kind === 'ROUTE' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {n.kind}
            </span>
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {n.kind === 'LINK'
              ? displayExternal || '(no URL)'
              : displayRouteOverride
                ? (displayRouteOverride.startsWith('/') ? displayRouteOverride : `/${displayRouteOverride}`)
                : n.kind === 'ROUTE'
                  ? displayRoutePath ? `/${displayRoutePath}` : '(no path)'
                  : displaySlug ? `/${displaySlug}` : '(no slug)'}
          </p>
        </div>

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => onUpdate(n.id, { visible: !n.visible })}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            n.visible
              ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'
          }`}
          title={n.visible ? 'Visible in nav' : 'Hidden from nav'}
        >
          {n.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {n.kind === 'PAGE' && (displaySlug || n.slug) && (
            <>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                onClick={edit}
                title="Edit page"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                onClick={preview}
                title="Preview page"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            disabled={atTop}
            onClick={moveUp}
            title="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            disabled={atBottom}
            onClick={moveDown}
            title="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              disabled={!n.parentId}
              onClick={outdent}
              title="Outdent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={() => setShowDetails(!showDetails)}
            title="Edit details"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => onDelete(n.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable details panel */}
      {showDetails && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-md bg-slate-200 px-2 py-0.5 font-semibold uppercase tracking-wide dark:bg-slate-700">
              {locale}
            </span>
            <span>Editing locale</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Label</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={displayLabel ?? ''}
                onChange={(e) => {
                  const targetId = n.idsByLocale?.[locale] || n.id;
                  onUpdate(targetId, { navLabel: e.target.value });
                }}
                placeholder="Display name"
              />
            </div>
            {n.kind === 'ROUTE' ? (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Route path</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    value={displayRoutePath ?? ''}
                    onChange={(e) => {
                      const targetId = n.idsByLocale?.[locale] || n.id;
                      onUpdate(targetId, { routePath: e.target.value });
                    }}
                    placeholder="pages/news or pages/news/[slug]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Route slug</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    value={(n.slugByLocale?.[locale] ?? n.slug) || ''}
                    onChange={(e) => {
                      const targetId = n.idsByLocale?.[locale] || n.id;
                      onUpdate(targetId, { slug: e.target.value });
                    }}
                    placeholder="fills [slug] or appends"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {n.kind === 'LINK' ? 'External URL' : 'Slug'}
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  value={n.kind === 'LINK' ? (displayExternal ?? '') : (displaySlug ?? '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    const targetId = n.idsByLocale?.[locale] || n.id;
                    if (n.kind === 'LINK') {
                      onUpdate(targetId, { externalUrl: v, slug: null });
                    } else {
                      if (v.startsWith('http')) onUpdate(targetId, { kind: 'LINK', externalUrl: v, slug: null });
                      else if (v.includes('/')) onUpdate(targetId, { kind: 'ROUTE', routePath: v, slug: null, externalUrl: null });
                      else onUpdate(targetId, { slug: v });
                    }
                  }}
                  placeholder={n.kind === 'LINK' ? 'https://...' : 'e.g. about-us'}
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={n.kind}
                onChange={(e) => onUpdate(n.id, { kind: e.target.value })}
              >
                <option value="PAGE">📄 Page</option>
                <option value="FOLDER">📁 Folder</option>
                <option value="LINK">🔗 External Link</option>
                <option value="ROUTE">🛤️ Dynamic Route</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Route override (optional)</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={displayRouteOverride ?? ''}
                onChange={(e) => {
                  const targetId = n.idsByLocale?.[locale] || n.id;
                  onUpdate(targetId, { routeOverride: e.target.value || null });
                }}
                placeholder="e.g. pages/news or /custom/path (supports [slug])"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Parent</label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                value={n.parentId || ''}
                onChange={(e) => onUpdate(n.id, { parentId: e.target.value || null, order: 0 })}
              >
                <option value="">(Root level)</option>
                {flatNodes.filter((p) => p.id !== n.id && p.kind !== 'LINK').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.navLabel || p.slug || p.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Children */}
      {hasChildren && expanded && (
        <div 
          className="border-t border-slate-100 bg-slate-50/30 py-3 pl-8 pr-3 dark:border-slate-800 dark:bg-slate-800/20"
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.stopPropagation()}
          onDragOver={(e) => e.stopPropagation()}
          onDragEnter={(e) => e.stopPropagation()}
          onDrop={(e) => e.stopPropagation()}
        >
          <NavTree nodes={n.children} fullTree={fullTree} flatNodes={flatNodes} parentId={n.id} draggingId={draggingId} dropTargetId={dropTargetId} dropMode={dropMode} setDraggingId={setDraggingId} setDropTargetId={setDropTargetId} setDropMode={setDropMode} onUpdate={onUpdate} onDelete={onDelete} locale={locale} buildHierarchicalSlug={buildHierarchicalSlug} />
        </div>
      )}
    </li>
  );
}

