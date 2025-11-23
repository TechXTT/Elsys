"use client";

import React, { useCallback, useEffect, useMemo, useState, DragEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { locales as supportedLocales, defaultLocale } from "@/i18n/config";

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

  const load = useCallback(async (fetchLocale: string = PRIMARY_LOCALE) => {
    setLoading(true);
    setError(null);
    try {
      const search = fetchLocale ? `?locale=${encodeURIComponent(fetchLocale)}` : "";
      const res = await fetch(`/api/admin/navigation${search}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setTree(data.items as PageNode[]);
    } catch (e: any) {
      setError(e.message || "Failed to load navigation");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

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

  function update(id: string, patch: Partial<PageNode>) {
    // Optimistic local update only
    setTree(prev => {
      const clone = prev.map(deepClone);
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
      const removed = removeNode(clone, id);
      if (!removed) return clone;
      Object.assign(removed, patch);
      const targetParent = removed.parentId;
      if (targetParent) {
        const parentNode = findNode(clone, targetParent);
        (parentNode ? parentNode.children : clone).push(removed);
      } else clone.push(removed);
      normalize(clone);
      return clone;
    });
    setPending(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }

  async function saveAll() {
    if (!Object.keys(pending).length) return;
    setSaving(true); setError(null);
    try {
      for (const id of Object.keys(pending)) {
        const patch = pending[id];
        const res = await fetch(`/api/admin/navigation/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
        if (!res.ok) {
          const data = await res.json().catch(()=>({}));
          throw new Error(data.error || 'Failed saving some changes');
        }
      }
      setPending({});
      await load();
    } catch (e:any) {
      setError(e.message || 'Save failed');
    } finally { setSaving(false); }
  }

  async function discardAll() {
    if (!Object.keys(pending).length) return;
    if (!confirm('Discard all unsaved changes?')) return;
    setPending({});
    await load();
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

  async function remove(id: string) {
    if (!confirm('Delete this item and its descendants?')) return;
    const res = await fetch(`/api/admin/navigation/${id}`, { method: 'DELETE' });
    if (!res.ok) { setError('Delete failed'); return; }
    setTree(prev => prev.filter(n => n.id !== id));
    void load();
  }

  function buildHierarchicalSlug(node: PageNode, tree: PageNode[], loc?: string): string {
    const path: string[] = [];
    let cur: PageNode | null = node;
    function getById(id: string | null): PageNode | null { if(!id) return null; return findNode(tree,id); }
    while (cur) {
      const seg = loc ? (cur.slugByLocale?.[loc] ?? cur.slug) : (cur.slug ?? null);
      if (seg) path.unshift(seg);
      cur = getById(cur.parentId);
    }
    return path.join('/');
  }

  function handleLocaleSwitch(next: string) {
    if (next === locale) return;
    setLocale(next);
  }

  return (
    <div className="space-y-6">
      <div className="fixed left-2 bottom-8 z-50 pointer-events-none">
        <div className="relative inline-block">
          <div
            role="group"
            aria-label="Locale switcher"
            className="inline-flex overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 text-xs backdrop-blur-sm shadow-sm dark:border-slate-700/50 dark:bg-slate-800/70 pointer-events-auto"
          >
            {(["bg", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleLocaleSwitch(code)}
                aria-pressed={locale === code}
                className={`px-3 py-1.5 font-semibold uppercase tracking-wide outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  locale === code
                    ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                    : "bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-slate-100"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
          {(loading || error) && (
            <div className="absolute left-0 right-0 top-full mt-1 pl-1 text-xs leading-5 pointer-events-none">
              {loading && <div className="text-slate-600 dark:text-slate-400 animate-pulse">Loading…</div>}
              {error && <div className="text-red-600 font-medium">{error}</div>}
            </div>
          )}
        </div>
      </div>
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Navigation</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Unified hierarchical Pages (per-locale tree).</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={saveAll}
              disabled={!Object.keys(pending).length || saving}
              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
              title="Save all changes (Cmd/Ctrl+S)"
            >{saving? 'Saving…':'Save'}</button>
            <button
              onClick={discardAll}
              disabled={!Object.keys(pending).length || saving}
              className="rounded border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
              title="Discard unsaved changes"
            >Discard</button>
            {Object.keys(pending).length ? <span className="text-[10px] text-slate-500">{Object.keys(pending).length} pending</span> : null}
          </div>
        </div>
      </header>

      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : error ? <p className="text-sm text-red-600">{error}</p> : (
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
        )}
        {/* Floating Save button for anywhere access */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={saveAll}
            disabled={!Object.keys(pending).length || saving}
            className="relative shadow-lg rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            title="Save all changes (Cmd/Ctrl+S)"
          >
            {saving ? 'Saving…' : 'Save'}
            {Object.keys(pending).length ? (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-white text-green-700 text-xs font-bold flex items-center justify-center border border-green-600">
                {Object.keys(pending).length}
              </span>
            ) : null}
          </button>
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Create Item ({locale.toUpperCase()})</h2>
        <form onSubmit={createItem} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            <span>Parent</span>
            <select className="rounded border px-2 py-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={newParent} onChange={e=>setNewParent(e.target.value)}>
              <option value="">(root)</option>
              {flat.map(p=> <option key={p.id} value={p.id}>{p.navLabel || p.slug || p.id}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span>Kind</span>
            <select className="rounded border px-2 py-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={newKind} onChange={e=>setNewKind(e.target.value)}>
              <option value="PAGE">PAGE</option>
              <option value="LINK">LINK</option>
              <option value="FOLDER">FOLDER</option>
              <option value="ROUTE">ROUTE</option>
            </select>
          </label>
          {NAV_LOCALES.map((code: string) => (
            <label key={`segment-${code}`} className="flex flex-col gap-1 text-xs">
              <span>{code.toUpperCase()} {newKind==='LINK' ? 'URL' : (newKind==='ROUTE' ? 'Route path' : 'Segment')}</span>
              <input
                disabled={newKind==='LINK'}
                value={newKind==='ROUTE' ? newRoutePath[code] : newSlug[code]}
                onChange={e=>{ const val = e.target.value; setNewRoutePath(prev => ({ ...prev, [code]: newKind==='ROUTE'?val:prev[code] })); setNewSlug(prev => ({ ...prev, [code]: newKind==='ROUTE'?prev[code]:val })); }}
                className="rounded border px-2 py-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                placeholder={newKind==='ROUTE' ? 'pages/news or pages/news/[slug]' : 'e.g. priem'}
              />
            </label>
          ))}
          {newKind==='ROUTE' && NAV_LOCALES.map((code) => (
            <label key={`route-slug-${code}`} className="flex flex-col gap-1 text-xs">
              <span>{code.toUpperCase()} Route slug</span>
              <input value={newRouteSlug[code]} onChange={e=>setNewRouteSlug(prev=>({ ...prev, [code]: e.target.value }))} className="rounded border px-2 py-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" placeholder="e.g. my-article or foo/bar" />
            </label>
          ))}
          {NAV_LOCALES.map((code) => (
            <label key={`external-${code}`} className="flex flex-col gap-1 text-xs">
              <span>{code.toUpperCase()} External URL</span>
              <input disabled={newKind!=='LINK'} value={newExternal[code]} onChange={e=>setNewExternal(prev=>({ ...prev, [code]: e.target.value }))} className="rounded border px-2 py-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" placeholder="https://..." />
            </label>
          ))}
          {NAV_LOCALES.map((code) => (
            <label key={`label-${code}`} className="flex flex-col gap-1 text-xs sm:col-span-2">
              <span>{code.toUpperCase()} Label</span>
              <input value={newNavLabel[code]} onChange={e=>setNewNavLabel(prev=>({ ...prev, [code]: e.target.value }))} className="rounded border px-2 py-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" placeholder="Display label" />
            </label>
          ))}
          {NAV_LOCALES.map((code) => (
            <label key={`override-${code}`} className="flex flex-col gap-1 text-xs sm:col-span-2">
              <span>{code.toUpperCase()} Route override</span>
              <input value={newRouteOverride[code]} onChange={e=>setNewRouteOverride(prev=>({ ...prev, [code]: e.target.value }))} className="rounded border px-2 py-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" placeholder="e.g. pages/news or /custom/path" />
            </label>
          ))}
          <div className="sm:col-span-4">
            <button disabled={creating} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Create</button>
          </div>
        </form>
      </section>
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
  const rafRef = useRef<number | null>(null);
  const velRef = useRef(0);
  const dragImgRef = useRef<HTMLElement | null>(null);

  function onDragStart(e: DragEvent<HTMLDivElement>, id: string, dragEl?: HTMLElement | null) {
    setDraggingId(id);
    if (e.dataTransfer && dragEl) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', id); } catch {}
      const rect = dragEl.getBoundingClientRect();
      const clone = dragEl.cloneNode(true) as HTMLElement;
      clone.style.position='fixed'; clone.style.top='-1000px'; clone.style.left='-1000px'; clone.style.width=rect.width+'px'; clone.style.opacity='0.9'; clone.style.pointerEvents='none';
      document.body.appendChild(clone); dragImgRef.current = clone;
      try { e.dataTransfer.setDragImage(clone, Math.min(40, rect.width/3), 16); } catch {}
    }
  }
  function onDragOverItem(id: string, mode: DropMode, clientY: number | null) {
    setDropTargetId(id); setDropMode(mode); updateAuto(clientY ?? undefined);
  }
  function stopAuto() { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current=null; velRef.current=0; }
  function updateAuto(clientY?: number) {
    if (!draggingId || clientY === undefined) { stopAuto(); return; }
    const threshold = 140; const maxVel = 35; const minVel = 6; const vh = window.innerHeight;
    let v = 0;
    if (clientY < threshold) {
      const t = (threshold - clientY) / threshold; const eased = Math.pow(t, 1.2); v = -Math.ceil(Math.max(minVel, eased * maxVel));
    } else if (clientY > vh - threshold) {
      const t = (clientY - (vh - threshold)) / threshold; const eased = Math.pow(t, 1.2); v = Math.ceil(Math.max(minVel, eased * maxVel));
    }
    velRef.current = v;
    if (v !== 0 && rafRef.current === null) {
      const step = () => {
        if (!draggingId || velRef.current === 0) { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); rafRef.current = null; return; }
        window.scrollBy(0, velRef.current);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    } else if (v === 0 && rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }
  function onDrop() {
    if (draggingId && dropTargetId && draggingId !== dropTargetId) {
      const isListZone = dropTargetId.startsWith("__LIST_ZONE__:");
      const isOutdentZone = dropTargetId.startsWith("__OUTDENT_AFTER_PARENT__:");
      if (isOutdentZone) {
        const [, childId] = dropTargetId.split(":");
        const childNode = findNode(fullTree, childId);
        if (childNode) {
          const parent = childNode.parentId ? findNode(fullTree, childNode.parentId) : null;
          const grandParentId = parent?.parentId ?? null;
          const targetOrder = parent ? (parent.order + 1) : 0;
          onUpdate(draggingId, { parentId: grandParentId, order: targetOrder });
        }
      } else if (isListZone) {
        const parts = dropTargetId.split(":");
        const zone = parts[1];
        if (zone === "before") {
          const targetNodeId = parts[2];
          const drag = findNode(fullTree, draggingId);
          const over = findNode(fullTree, targetNodeId);
          if (drag && over) {
            const targetOrder = (over.order ?? 0) - 1;
            onUpdate(drag.id, { parentId: over.parentId ?? null, order: targetOrder });
          }
        } else {
          const pidRaw = parts[2];
          const pid = pidRaw === 'root' ? null : pidRaw;
          const children = getChildrenOf(pid);
          const orders = children.map(c => c.order);
          const min = orders.length ? Math.min(...orders) : 0;
          const max = orders.length ? Math.max(...orders) : 0;
          const targetOrder = zone === 'start' ? (min - 1) : (max + 1);
          const drag = findNode(fullTree, draggingId);
          if (drag) onUpdate(drag.id, { parentId: pid, order: targetOrder });
        }
      } else {
        const drag = findNode(fullTree, draggingId); const over = findNode(fullTree, dropTargetId);
        if (drag && over) {
          if (dropMode==='inside') onUpdate(drag.id, { parentId: over.id, order: 9999 });
          else {
            const sameParent = drag.parentId === over.parentId;
            const targetOrder = dropMode==='below'? (over.order+1) : (over.order-1);
            onUpdate(drag.id, { parentId: over.parentId ?? null, order: targetOrder });
            if (sameParent) onUpdate(over.id, { order: drag.order });
          }
        }
      }
    }
    setDraggingId(null); setDropTargetId(null); stopAuto();
    if (dragImgRef.current) { try { document.body.removeChild(dragImgRef.current); } catch {} dragImgRef.current=null; }
  }
  function findNode(list: PageNode[], id: string): PageNode | null { for (const n of list){ if(n.id===id) return n; const f=findNode(n.children,id); if(f) return f; } return null; }

  const isRoot = parentId === null;
  function getChildrenOf(pid: string | null): PageNode[] {
    if (pid == null) return fullTree;
    const p = findNode(fullTree, pid);
    return p?.children || [];
  }
  // Attach global cancel handlers at root list
  React.useEffect(() => {
    if (parentId !== null) return;
    const cancel = () => { setDraggingId(null); setDropTargetId(null); stopAuto(); if (dragImgRef.current) { try { document.body.removeChild(dragImgRef.current); } catch {} dragImgRef.current = null; } };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('dragend', cancel);
    window.addEventListener('drop', cancel);
    window.addEventListener('pointerup', cancel);
    window.addEventListener('mouseleave', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('dragend', cancel);
      window.removeEventListener('drop', cancel);
      window.removeEventListener('pointerup', cancel);
      window.removeEventListener('mouseleave', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', esc);
    };
  }, [parentId]);
  return (
    <div className="relative">
      <ul
        className="space-y-2"
        onDragOver={(e) => {
          if (!draggingId) return;
          if (e.target !== e.currentTarget) return; // only background
          e.preventDefault();
          setDropTargetId(`__LIST_ZONE__:start:${parentId ?? 'root'}`);
          setDropMode('above');
          updateAuto(e.clientY);
        }}
      >
        {draggingId ? (
          <li
            onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; setDropTargetId(`__LIST_ZONE__:start:${parentId ?? 'root'}`); setDropMode('above'); updateAuto(e.clientY); }}
            onDrop={onDrop}
          >
            {dropTargetId === `__LIST_ZONE__:start:${parentId ?? 'root'}` ? (
              <div className="my-2 h-10 w-full rounded border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-900/20" />
            ) : (
              <div className="h-6" />
            )}
          </li>
        ) : null}
        {nodes.map((n, idx) => (
          <React.Fragment key={n.id}>
            {draggingId && draggingId !== n.id && idx !== 0 ? (
              <li
                onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; setDropTargetId(`__LIST_ZONE__:before:${n.id}`); setDropMode('above'); updateAuto(e.clientY); }}
                onDrop={onDrop}
              >
                {dropTargetId === `__LIST_ZONE__:before:${n.id}` ? (
                  <div className="my-2 h-10 w-full rounded border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-900/20" />
                ) : (
                  <div className="h-6" />
                )}
              </li>
            ) : null}
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
              onDragOverItem={onDragOverItem}
              onDrop={onDrop}
              onUpdate={onUpdate}
              onDelete={onDelete}
              locale={locale}
              buildHierarchicalSlug={buildHierarchicalSlug}
            />
          </React.Fragment>
        ))}
        {draggingId ? (
          <li
            onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; setDropTargetId(`__LIST_ZONE__:end:${parentId ?? 'root'}`); setDropMode('below'); updateAuto(e.clientY); }}
            onDrop={onDrop}
          >
            {dropTargetId === `__LIST_ZONE__:end:${parentId ?? 'root'}` ? (
              <div className="my-2 h-10 w-full rounded border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-900/20" />
            ) : (
              <div className="h-8" />
            )}
          </li>
        ) : null}
        {isRoot && nodes.length===0 && !draggingId && <li className="text-xs text-slate-500">No items</li>}
      </ul>
    </div>
  );
}

function NavItem({ node: n, fullTree, flatNodes, draggingId, dropTargetId, dropMode, setDraggingId, setDropTargetId, setDropMode, onDragStart, onDragOverItem, onDrop, onUpdate, onDelete, locale, buildHierarchicalSlug }: {
  node: PageNode; fullTree: PageNode[]; flatNodes: PageNode[]; draggingId: string | null; dropTargetId: string | null; dropMode: DropMode; setDraggingId: (id:string|null)=>void; setDropTargetId:(id:string|null)=>void; setDropMode:(m:DropMode)=>void; onDragStart:(e:DragEvent<HTMLDivElement>,id:string,el?:HTMLElement|null)=>void; onDragOverItem:(id:string,mode:DropMode, clientY: number | null)=>void; onDrop:()=>void; onUpdate:(id:string,patch:Partial<PageNode>)=>void; onDelete:(id:string)=>void; locale:string; buildHierarchicalSlug:(n:PageNode,t:PageNode[], loc?: string)=>string }) {
  const router = useRouter();
  const [expanded,setExpanded]=useState(false);
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
  async function moveUp(){ if(atTop) return; const prev=ordered[idx-1]; onUpdate(n.id,{order:prev.order}); onUpdate(prev.id,{order:n.order}); }
  async function moveDown(){ if(atBottom) return; const next=ordered[idx+1]; onUpdate(n.id,{order:next.order}); onUpdate(next.id,{order:n.order}); }
  function hierarchical(){ return buildHierarchicalSlug(n, fullTree); }
  function preview(){
    const slug = (n.slugByLocale?.[locale] ?? n.slug);
    if(n.kind!=='PAGE'||!slug) return; const path=buildHierarchicalSlug(n, fullTree, locale); window.open(`/${locale}/${path}`,'_blank');
  }
  function edit(){ router.push(`/admin/pages/${n.id}`); }
  function onDragOver(e:DragEvent<HTMLLIElement>){
    e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (!liRef.current) { onDragOverItem(n.id, 'inside', e.clientY); return; }
    const rect = liRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (draggingId === n.id) {
      if (n.parentId && x < Math.min(32, rect.width * 0.1)) {
        onDragOverItem(`__OUTDENT_AFTER_PARENT__:${n.id}` as any, 'above', e.clientY);
      }
      return;
    }
    onDragOverItem(n.id, 'inside', e.clientY);
  }
  function onDragLeave(){ onDragOverItem(n.id, 'inside', null); }
  function onDragEnter(e:DragEvent){ e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }
  return (
    <li ref={liRef} className={`rounded border p-3 dark:border-slate-700 bg-white dark:bg-slate-900 group ${dropTargetId===n.id && dropMode==='inside'?'border-blue-400 ring-1 ring-blue-300':'border-slate-200'} ${draggingId===n.id?'opacity-40':''}`}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDragEnter={onDragEnter} onDrop={onDrop}>
      {dropTargetId === `__OUTDENT_AFTER_PARENT__:${n.id}` ? (
        <div className="-mt-3 mb-2 flex items-center gap-2 text-xs text-blue-400">
          <div className="h-0.5 w-full bg-blue-500" />
          <span className="shrink-0">Outdent here</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {hasChildren ? <button type="button" onClick={()=>setExpanded(!expanded)} className="rounded border border-slate-300 px-2 py-0.5 text-[18px] font-semibold">{expanded?'▾':'▸'}</button> : <span className="px-2 py-0.5 text-[10px] text-slate-400">•</span>}
        <div className="cursor-grab rounded border border-slate-300 px-2 py-0.5 text-[10px] font-semibold" draggable onDragStart={e=>onDragStart(e,n.id,liRef.current)}>::</div>
        <span className="font-medium text-slate-900 dark:text-slate-100">{displayLabel || displaySlug || displayExternal || n.id}</span>
        <span className="text-xs text-slate-500">{
          n.kind==='LINK'
            ? (displayExternal || '')
            : (displayRouteOverride ? (displayRouteOverride.startsWith('/')? displayRouteOverride : `/${displayRouteOverride}`)
               : (n.kind==='ROUTE' ? (displayRoutePath ? `/${displayRoutePath}` : '') : (displaySlug ? `/${displaySlug}` : '')))
        }</span>
        <label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" className="accent-blue-600" checked={n.visible} onChange={e=>onUpdate(n.id,{visible:e.target.checked})} /><span>Visible</span></label>
        {n.kind==='PAGE' && (displaySlug || n.slug) && <><button className="rounded border px-2 py-0.5 text-xs" onClick={edit}>Edit</button><button className="rounded border px-2 py-0.5 text-xs" onClick={preview}>Preview</button></>}
        <button className="rounded border px-2 py-0.5 text-xs" disabled={atTop} onClick={moveUp}>Up</button>
        <button className="rounded border px-2 py-0.5 text-xs" disabled={atBottom} onClick={moveDown}>Down</button>
        <button className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700" onClick={()=>onDelete(n.id)}>Delete</button>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="text-xs"><span className="text-slate-600 dark:text-slate-300">Label</span><input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={displayLabel ?? ''} onChange={e=>{ const targetId = n.idsByLocale?.[locale] || n.id; onUpdate(targetId,{navLabel:e.target.value}); }} /></label>
        {n.kind==='ROUTE' ? (
          <>
            <label className="text-xs"><span className="text-slate-600 dark:text-slate-300">Route path</span><input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={displayRoutePath ?? ''} onChange={e=>{ const v=e.target.value; const targetId = n.idsByLocale?.[locale] || n.id; onUpdate(targetId,{routePath:v}); }} placeholder="pages/news or pages/news/[slug]" /></label>
            <label className="text-xs"><span className="text-slate-600 dark:text-slate-300">Route slug</span><input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={(n.slugByLocale?.[locale] ?? n.slug) || ''} onChange={e=>{ const v=e.target.value; const targetId = n.idsByLocale?.[locale] || n.id; onUpdate(targetId,{slug:v}); }} placeholder="fills [slug] or appends" /></label>
          </>
        ) : (
          <label className="text-xs"><span className="text-slate-600 dark:text-slate-300">Segment / URL</span><input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={n.kind==='LINK' ? (displayExternal ?? '') : (displaySlug ?? '')} onChange={e=>{ const v=e.target.value; const targetId = n.idsByLocale?.[locale] || n.id; if(n.kind==='LINK'){ onUpdate(targetId,{externalUrl:v,slug:null}); } else { if(v.startsWith('http')) onUpdate(targetId,{kind:'LINK',externalUrl:v,slug:null}); else if (v.includes('/')) onUpdate(targetId,{kind:'ROUTE',routePath:v,slug:null,externalUrl:null}); else onUpdate(targetId,{slug:v}); } }} /></label>
        )}
        <label className="text-xs sm:col-span-3"><span className="text-slate-600 dark:text-slate-300">Route override (optional)</span><input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={displayRouteOverride ?? ''} onChange={e=>{ const v=e.target.value; const targetId = n.idsByLocale?.[locale] || n.id; onUpdate(targetId, { routeOverride: v || null }); }} placeholder="e.g. pages/news or /custom/path (supports [slug])" /></label>
        <label className="text-xs"><span className="text-slate-600 dark:text-slate-300">Kind</span><select className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={n.kind} onChange={e=>onUpdate(n.id,{kind:e.target.value})}><option value="PAGE">PAGE</option><option value="LINK">LINK</option><option value="FOLDER">FOLDER</option><option value="ROUTE">ROUTE</option></select></label>
        <label className="text-xs sm:col-span-3"><span className="text-slate-600 dark:text-slate-300">Parent</span><select className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" value={n.parentId||''} onChange={e=>onUpdate(n.id,{parentId:e.target.value||null,order:0})}><option value="">(root)</option>{flatNodes.filter(p=>p.id!==n.id && p.kind!=='LINK').map(p=> <option key={p.id} value={p.id}>{p.navLabel||p.slug||p.id}</option>)}</select></label>
      </div>
      {hasChildren && expanded && (
        <div className="mt-2 border-l border-slate-200 pl-4 dark:border-slate-700">
          <NavTree nodes={n.children} fullTree={fullTree} flatNodes={flatNodes} parentId={n.id} draggingId={draggingId} dropTargetId={dropTargetId} dropMode={dropMode} setDraggingId={setDraggingId} setDropTargetId={setDropTargetId} setDropMode={setDropMode} onUpdate={onUpdate} onDelete={onDelete} locale={locale} buildHierarchicalSlug={buildHierarchicalSlug} />
        </div>
      )}
    </li>
  );
}

