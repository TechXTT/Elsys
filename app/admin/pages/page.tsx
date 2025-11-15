"use client";

import React, { useEffect, useMemo, useState, DragEvent, useRef } from "react";
import { useRouter } from "next/navigation";

type NavNode = {
  id: string;
  parentId?: string | null;
  order: number;
  slug?: string | null;
  externalUrl?: string | null;
  visible: boolean;
  accessRole?: string | null;
  labels: Record<string, string>;
  meta?: Record<string, any> | null;
  children: NavNode[];
};

export default function NavigationAdminPage() {
  const [tree, setTree] = useState<NavNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Global drag state so deep nested items can interact with root zones
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropMode, setDropMode] = useState<DropMode>("inside");

  const [newParent, setNewParent] = useState<string | "">("");
  const [newSlug, setNewSlug] = useState<string>("");
  const [newExternal, setNewExternal] = useState<string>("");
  const [newLabelBg, setNewLabelBg] = useState<string>("");
  const [newLabelEn, setNewLabelEn] = useState<string>("");
  const [newSlugBg, setNewSlugBg] = useState<string>("");
  const [newSlugEn, setNewSlugEn] = useState<string>("");
  // Optional: allow specifying target Page IDs on create (advanced)
  const [newPageIdBg, setNewPageIdBg] = useState<string>("");
  const [newPageIdEn, setNewPageIdEn] = useState<string>("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/navigation", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setTree(data.items as NavNode[]);
    } catch (e: any) {
      setError(e.message || "Failed to load navigation");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const flat = useMemo(() => {
    const arr: NavNode[] = [];
    function walk(n: NavNode[]) { n.forEach((x) => { arr.push(x); walk(x.children || []); }); }
    walk(tree);
    return arr;
  }, [tree]);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload: any = {
        parentId: newParent || null,
        order: 0,
        slug: newSlug || null,
        externalUrl: newExternal || null,
        visible: true,
        labels: { bg: newLabelBg || newLabelEn || "", en: newLabelEn || newLabelBg || "" },
        meta: (newSlugBg || newSlugEn || newPageIdBg || newPageIdEn)
          ? {
              slugByLocale: (newSlugBg || newSlugEn)
                ? { bg: newSlugBg || undefined, en: newSlugEn || undefined }
                : undefined,
              pageIdByLocale: (newPageIdBg || newPageIdEn)
                ? { bg: newPageIdBg || undefined, en: newPageIdEn || undefined }
                : undefined,
            }
          : null,
      };
      const res = await fetch("/api/admin/navigation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setNewParent(""); setNewSlug(""); setNewExternal(""); setNewLabelBg(""); setNewLabelEn(""); setNewSlugBg(""); setNewSlugEn(""); setNewPageIdBg(""); setNewPageIdEn("");
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to create item");
    } finally {
      setCreating(false);
    }
  }

  async function update(id: string, patch: Partial<NavNode>) {
    // Optimistic structural update (handles parentId moves & order changes) + simple field patch
    setTree(prev => {
      // Deep clone for safe structural mutations
      const clone: NavNode[] = prev.map(c => deepClone(c));
      const needsStructure = Object.prototype.hasOwnProperty.call(patch, 'parentId') || Object.prototype.hasOwnProperty.call(patch, 'order');
      if (!needsStructure) {
        return clone.map(n => patchNode(n, id, patch));
      }
      const removed = removeNode(clone, id);
      if (!removed) {
        return clone; // nothing found
      }
      // Apply field patch to removed node
      Object.assign(removed, patch);
      // Insert into new parent (or root)
      const targetParentId = removed.parentId ?? null;
      if (targetParentId === null) {
        clone.push(removed);
      } else {
        const parentNode = findNodeById(clone, targetParentId);
        if (parentNode) {
          parentNode.children.push(removed);
        } else {
          // fallback: put back at root if parent missing
          removed.parentId = null;
          clone.push(removed);
        }
      }
      // Normalize sibling ordering per parent: sort and reindex 0..n-1
      function sortAndReindex(list: NavNode[]) {
        list.sort((a, b) => a.order - b.order);
        list.forEach((child, i) => { child.order = i; });
        list.forEach(child => sortAndReindex(child.children));
      }
      sortAndReindex(clone);
      return clone;
    });
    const res = await fetch(`/api/admin/navigation/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Update failed (reverting)");
      void load();
    } else {
      void fetch("/api/admin/navigation", { cache: "no-store" })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d?.items)) setTree(d.items as NavNode[]); })
        .catch(() => {});
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this item? Children will be deleted too.")) return;
    const res = await fetch(`/api/admin/navigation/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Delete failed");
    } else {
      // Optimistically drop
      setTree(prev => prev.filter(n => n.id !== id));
      void load();
    }
  }

  function patchNode(node: NavNode, id: string, patch: Partial<NavNode>): NavNode {
    if (node.id === id) {
      return { ...node, ...patch, children: node.children.map(c => patchNode(c, id, patch)) };
    }
    return { ...node, children: node.children.map(c => patchNode(c, id, patch)) };
  }

  function deepClone(node: NavNode): NavNode {
    return {
      id: node.id,
      parentId: node.parentId ?? null,
      order: node.order,
      slug: node.slug ?? null,
      externalUrl: node.externalUrl ?? null,
      visible: node.visible,
      accessRole: node.accessRole ?? null,
      labels: { ...node.labels },
      meta: node.meta ? JSON.parse(JSON.stringify(node.meta)) : null,
      children: node.children.map(deepClone),
    };
  }

  function findNodeById(list: NavNode[], id: string): NavNode | undefined {
    for (const n of list) {
      if (n.id === id) return n;
      const c = findNodeById(n.children, id);
      if (c) return c;
    }
    return undefined;
  }

  function removeNode(list: NavNode[], id: string): NavNode | null {
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n.id === id) {
        list.splice(i, 1);
        return n;
      }
      const childRemoved = removeNode(n.children, id);
      if (childRemoved) return childRemoved;
    }
    return null;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Navigation</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Manage top-level and nested menu items with localized labels.</p>
      </header>

      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">Error: {error}</p>
        ) : (
          <div className="space-y-2">
            {tree.length === 0 ? <p className="text-sm text-slate-500">No items yet.</p> : null}
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
            />
          </div>
        )}
      </section>

      <section className="rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Create item</h2>
        <form onSubmit={createItem} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/** Shared input styling for theme awareness */}
          {/** Using utility constant not possible directly in JSX, so inline class string repeated. */}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Parent</span>
            <select className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newParent} onChange={(e) => setNewParent(e.target.value)}>
              <option value="">(root)</option>
              {flat.map((n) => <option key={n.id} value={n.id}>{n.labels?.bg || n.labels?.en || n.slug || n.externalUrl || n.id}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Internal slug</span>
            <input className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="e.g. priem/red-i-uslovija-za-priem" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">External URL</span>
            <input className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newExternal} onChange={(e) => setNewExternal(e.target.value)} placeholder="https://example.com" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Slug override (bg)</span>
            <input className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newSlugBg} onChange={(e) => setNewSlugBg(e.target.value)} placeholder="bg slug e.g. novini" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Slug override (en)</span>
            <input className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newSlugEn} onChange={(e) => setNewSlugEn(e.target.value)} placeholder="en slug e.g. news" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Target Page ID (bg)</span>
            <input className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newPageIdBg} onChange={(e) => setNewPageIdBg(e.target.value)} placeholder="optional: page id for BG" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Target Page ID (en)</span>
            <input className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newPageIdEn} onChange={(e) => setNewPageIdEn(e.target.value)} placeholder="optional: page id for EN" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Label (bg)</span>
            <input className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newLabelBg} onChange={(e) => setNewLabelBg(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-700 dark:text-slate-200">Label (en)</span>
            <input className="rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={newLabelEn} onChange={(e) => setNewLabelEn(e.target.value)} />
          </label>
          <div className="sm:col-span-3">
            <button disabled={creating} className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">Create</button>
          </div>
        </form>
      </section>
    </div>
  );
}

type DropMode = "inside" | "above" | "below";

function NavTree({
  nodes,
  fullTree,
  flatNodes,
  parentId,
  draggingId,
  dropTargetId,
  dropMode,
  setDraggingId,
  setDropTargetId,
  setDropMode,
  onUpdate,
  onDelete,
  ancestorHidden = false,
}: {
  nodes: NavNode[];
  fullTree: NavNode[];
  flatNodes: NavNode[];
  parentId: string | null;
  draggingId: string | null;
  dropTargetId: string | null;
  dropMode: DropMode;
  setDraggingId: (id: string | null) => void;
  setDropTargetId: (id: string | null) => void;
  setDropMode: (m: DropMode) => void;
  onUpdate: (id: string, p: Partial<NavNode>) => void;
  onDelete: (id: string) => void;
  ancestorHidden?: boolean;
}) {
  const rafRef = useRef<number | null>(null);
  const velRef = useRef(0);

  const dragImgRef = useRef<HTMLElement | null>(null);

  function onDragStart(e: DragEvent<HTMLDivElement>, id: string, dragEl?: HTMLElement | null) {
    setDraggingId(id);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", id); } catch {}
      if (dragEl) {
        const rect = dragEl.getBoundingClientRect();
        const clone = dragEl.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.top = '-1000px';
        clone.style.left = '-1000px';
        clone.style.width = rect.width + 'px';
        clone.style.pointerEvents = 'none';
        clone.style.opacity = '0.9';
        clone.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
        document.body.appendChild(clone);
        dragImgRef.current = clone;
        const offsetX = Math.min(40, rect.width / 3);
        const offsetY = 16;
        try { e.dataTransfer.setDragImage(clone, offsetX, offsetY); } catch {}
      }
    }
  }
  function onDragOverItem(id: string, mode: DropMode, clientY: number | null) {
    setDropTargetId(id);
    setDropMode(mode);
    updateAutoScroll(clientY ?? undefined);
  }
  async function onDrop() {
    if (draggingId && dropTargetId && draggingId !== dropTargetId) {
      const dragNode = find(fullTree, draggingId);
      const isListZone = dropTargetId.startsWith("__LIST_ZONE__:");
      const isOutdentZone = dropTargetId.startsWith("__OUTDENT_AFTER_PARENT__:");
      if (dragNode && isOutdentZone) {
        const [, childId] = dropTargetId.split(":");
        const childNode = find(fullTree, childId);
        if (childNode) {
          // Move dragged node to be a sibling after the child's parent
          const parent = childNode.parentId ? find(fullTree, childNode.parentId) : null;
          const grandParentId = parent?.parentId ?? null;
          const targetOrder = parent ? (parent.order + 1) : 0;
          await onUpdate(dragNode.id, { parentId: grandParentId, order: targetOrder });
        }
      } else if (dragNode && isListZone) {
        const parts = dropTargetId.split(":");
        const zone = parts[1];
        if (zone === "before") {
          const targetNodeId = parts[2];
          const overNode = find(fullTree, targetNodeId);
          if (overNode) {
            const targetOrder = overNode.order - 1;
            await onUpdate(dragNode.id, { parentId: overNode.parentId ?? null, order: targetOrder });
          }
        } else {
          const pidRaw = parts[2];
          const pid = pidRaw === "root" ? null : pidRaw;
          const children = getChildrenOf(pid);
          const orders = children.map(c => c.order);
          const min = orders.length ? Math.min(...orders) : 0;
          const max = orders.length ? Math.max(...orders) : 0;
          const targetOrder = zone === "start" ? min - 1 : max + 1;
          await onUpdate(dragNode.id, { parentId: pid, order: targetOrder });
        }
      } else if (dragNode) {
        const overNode = find(fullTree, dropTargetId);
        if (overNode) {
          if (dropMode === "inside") {
            const draggedDesc = collectDescendantsOf(draggingId);
            if (!draggedDesc.has(overNode.id)) {
              await onUpdate(dragNode.id, { parentId: overNode.id, order: 9999 });
            }
          } else {
            if (dragNode.parentId === overNode.parentId) {
              await onUpdate(dragNode.id, { order: overNode.order });
              await onUpdate(overNode.id, { order: dragNode.order });
            } else {
              const targetOrder = dropMode === "below" ? overNode.order + 1 : overNode.order - 1;
              await onUpdate(dragNode.id, { parentId: overNode.parentId ?? null, order: targetOrder });
            }
          }
        }
      }
    }
    setDraggingId(null);
    setDropTargetId(null);
    updateAutoScroll();
    if (dragImgRef.current) { try { document.body.removeChild(dragImgRef.current); } catch {} dragImgRef.current = null; }
  }

  function find(list: NavNode[], id: string): NavNode | null {
    for (const n of list) {
      if (n.id === id) return n;
      const c = find(n.children || [], id);
      if (c) return c;
    }
    return null;
  }

  function getChildrenOf(pid: string | null): NavNode[] {
    if (pid == null) return fullTree;
    const p = find(fullTree, pid);
    return p?.children || [];
  }

  function collectDescendants(rootId: string): Set<string> {
    const out = new Set<string>();
    function walk(list: NavNode[]) {
      for (const nd of list) {
        if (nd.id === rootId) {
          collect(nd);
        } else {
          walk(nd.children || []);
        }
      }
    }
    function collect(nd: NavNode) {
      for (const c of nd.children || []) {
        out.add(c.id);
        collect(c);
      }
    }
    walk(fullTree);
    return out;
  }

  function collectDescendantsOf(rootId: string): Set<string> {
    const out = new Set<string>();
    function dfs(list: NavNode[]): boolean {
      for (const nd of list) {
        if (nd.id === rootId) {
          collect(nd);
          return true;
        }
        if (dfs(nd.children || [])) return true;
      }
      return false;
    }
    function collect(nd: NavNode) {
      for (const c of nd.children || []) {
        out.add(c.id);
        collect(c);
      }
    }
    dfs(fullTree);
    return out;
  }

  function updateAutoScroll(clientY?: number) {
    // Auto-scroll window near viewport edges while dragging
    if (!draggingId || clientY === undefined) {
      stopAutoScroll();
      return;
    }
    // Increased sensitivity: larger threshold and higher max velocity
    const threshold = 140; // px
    const maxVel = 35; // px per frame at the extreme
    const minVel = 6; // ensure noticeable movement even near the threshold
    const vh = window.innerHeight;
    let v = 0;
    if (clientY < threshold) {
      const t = (threshold - clientY) / threshold; // 0..1
      const eased = Math.pow(t, 1.2);
      v = -Math.ceil(Math.max(minVel, eased * maxVel)); // px per frame up
    } else if (clientY > vh - threshold) {
      const t = (clientY - (vh - threshold)) / threshold; // 0..1
      const eased = Math.pow(t, 1.2);
      v = Math.ceil(Math.max(minVel, eased * maxVel)); // px per frame down
    }
    velRef.current = v;
    if (v !== 0 && rafRef.current === null) {
      const step = () => {
        if (!draggingId || velRef.current === 0) {
          if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          return;
        }
        window.scrollBy(0, velRef.current);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    } else if (v === 0 && rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function stopAutoScroll() {
    velRef.current = 0;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  useEffect(() => {
    if (!draggingId) {
      stopAutoScroll();
    }
  }, [draggingId]);

  // Cancellation of drag handled once at root tree only
  useEffect(() => {
    if (parentId !== null) return; // only attach global listeners at root
    const cancel = () => {
      setDraggingId(null);
      setDropTargetId(null);
      stopAutoScroll();
      if (dragImgRef.current) { try { document.body.removeChild(dragImgRef.current); } catch {} dragImgRef.current = null; }
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('dragend', cancel);
    window.addEventListener('drop', cancel);
    window.addEventListener('pointerup', cancel);
    window.addEventListener('mouseleave', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', escHandler);
    return () => {
      window.removeEventListener('dragend', cancel);
      window.removeEventListener('drop', cancel);
      window.removeEventListener('pointerup', cancel);
      window.removeEventListener('mouseleave', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', escHandler);
    };
  }, [parentId, setDraggingId, setDropTargetId]);

  const isRoot = parentId === null;
  return (
    <div className="relative">
      <ul
        className="space-y-2"
        onDragOver={(e) => {
          // When hovering the list background (not an item), default to start-of-list
          if (!draggingId) return;
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          setDropTargetId(`__LIST_ZONE__:start:${parentId ?? 'root'}`);
          setDropMode('above');
          updateAutoScroll(e.clientY);
        }}
      >
      {/* Single top placeholder rendered only via list background hover */}
      {draggingId && dropTargetId === `__LIST_ZONE__:start:${parentId ?? 'root'}` ? (
        <li>
          <div className="my-2 h-10 w-full rounded border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-900/20" />
        </li>
      ) : null}
      {nodes.map((n, idx) => (
        <React.Fragment key={n.id}>
          {/* Gap drop zone before each item for precise placement */}
          {draggingId && draggingId !== n.id ? (
            <li
              onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
              onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; setDropTargetId(`__LIST_ZONE__:before:${n.id}`); setDropMode('above'); updateAutoScroll(e.clientY); }}
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
            ancestorHidden={ancestorHidden}
            flatNodes={flatNodes}
            fullTree={fullTree}
            getDescendants={() => collectDescendants(n.id)}
            onDragStart={onDragStart}
            onDragOverItem={onDragOverItem}
            onDrop={onDrop}
            draggingId={draggingId}
            dropTargetId={dropTargetId}
            dropMode={dropMode}
            onUpdate={onUpdate}
            onDelete={onDelete}
            setDraggingId={setDraggingId}
            setDropTargetId={setDropTargetId}
            setDropMode={setDropMode}
          />
        </React.Fragment>
      ))}
      {/* List end drop zone: drop as last child of this list's parent */}
      {draggingId ? (
        <li
          onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
          onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; setDropTargetId(`__LIST_ZONE__:end:${parentId ?? 'root'}`); setDropMode('below'); updateAutoScroll(e.clientY); }}
          onDrop={onDrop}
        >
          {dropTargetId === `__LIST_ZONE__:end:${parentId ?? 'root'}` ? (
            <div className="my-2 h-10 w-full rounded border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-900/20" />
          ) : (
            <div className="h-8" />
          )}
        </li>
      ) : null}
      </ul>
    </div>
  );
}

function NavItem({ node: n, ancestorHidden, flatNodes, fullTree, getDescendants, onDragStart, onDragOverItem, onDrop, draggingId, dropTargetId, dropMode, setDraggingId, setDropTargetId, setDropMode, onUpdate, onDelete }: {
  node: NavNode;
  ancestorHidden: boolean;
  flatNodes: NavNode[];
  fullTree: NavNode[];
  getDescendants: () => Set<string>;
  onDragStart: (e: DragEvent<HTMLDivElement>, id: string, el?: HTMLElement | null) => void;
  onDragOverItem: (id: string, mode: DropMode, clientY: number | null) => void;
  onDrop: () => void;
  draggingId: string | null;
  dropTargetId: string | null;
  dropMode: DropMode;
  setDraggingId: (id: string | null) => void;
  setDropTargetId: (id: string | null) => void;
  setDropMode: (m: DropMode) => void;
  onUpdate: (id: string, p: Partial<NavNode>) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(true);
  const hasChildren = (n.children?.length || 0) > 0;
  const effectiveHidden = ancestorHidden || !n.visible;
  const descendants = getDescendants();
  const liRef = React.useRef<HTMLLIElement | null>(null);

  // Helpers for per-level moves (Up/Down within same parent)
  function findById(list: NavNode[], id: string): NavNode | null {
    for (const it of list) {
      if (it.id === id) return it;
      const f = findById(it.children || [], id);
      if (f) return f;
    }
    return null;
  }
  function getSiblings(): NavNode[] {
    if (n.parentId) {
      const p = findById(fullTree, n.parentId);
      return p?.children || [];
    }
    return fullTree;
  }
  const sibs = getSiblings();
  const sibsSorted = [...sibs].sort((a, b) => a.order - b.order);
  const idxInLevel = Math.max(0, sibsSorted.findIndex((s) => s.id === n.id));
  const atTop = idxInLevel <= 0;
  const atBottom = idxInLevel < 0 || idxInLevel >= sibsSorted.length - 1;
  async function moveUpLevel() {
    if (atTop) return;
    const prev = sibsSorted[idxInLevel - 1];
    // Swap orders with previous sibling (same parent)
    await onUpdate(n.id, { order: prev.order });
    await onUpdate(prev.id, { order: n.order });
  }
  async function moveDownLevel() {
    if (atBottom) return;
    const next = sibsSorted[idxInLevel + 1];
    // Swap orders with next sibling (same parent)
    await onUpdate(n.id, { order: next.order });
    await onUpdate(next.id, { order: n.order });
  }

  async function goToEditAny() {
    try {
      const pidBg: string | undefined = (n.meta as any)?.pageIdByLocale?.bg;
      const pidEn: string | undefined = (n.meta as any)?.pageIdByLocale?.en;
      if (pidBg || pidEn) {
        router.push(`/admin/pages/${pidBg || pidEn}`);
        return;
      }
      if (!n.slug) return;
      const params = new URLSearchParams();
      params.set("q", n.slug);
      const res = await fetch(`/api/admin/pages?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      const pages = Array.isArray(data?.pages) ? data.pages as Array<{ id: string; slug: string; locale: string }> : [];
      const bySlug = pages.filter(p => p.slug === n.slug);
      if (bySlug.length === 0) {
        alert(`No page found for slug "${n.slug}". Create it from the editor.`);
        return;
      }
      const preferred = bySlug.find(p => p.locale === "bg") || bySlug.find(p => p.locale === "en") || bySlug[0];
      router.push(`/admin/pages/${preferred.id}`);
    } catch {
      alert("Failed to find page to edit");
    }
  }

  function handleDragOver(e: DragEvent<HTMLLIElement>) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (!liRef.current) return onDragOverItem(n.id, "inside", e.clientY);
    const rect = liRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    // Only allow nesting ("inside") within item interior; sibling reordering handled by gap zones outside the item.
    const mode: DropMode = "inside";
    // When dragging over itself, suppress self drop zones (except outdent gesture)
    if (draggingId === n.id) {
      if (n.parentId && x < Math.min(32, rect.width * 0.1)) {
        onDragOverItem(`__OUTDENT_AFTER_PARENT__:${n.id}`, "above", e.clientY);
      }
      return; // do not register self as drop target
    }
    // Normal hover over other items
    onDragOverItem(n.id, mode, e.clientY);
    // Removed auto-expand-on-hover during DnD per user request.
  }
  function handleDragLeave() {
    window.clearTimeout((handleDragOver as any)._t);
    onDragOverItem(n.id, "inside", null);
  }
  function handleDragEnter(e: DragEvent<HTMLLIElement>) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  const isDropTarget = dropTargetId === n.id;
  const isOutdentTarget = dropTargetId === `__OUTDENT_AFTER_PARENT__:${n.id}`;
  const Ghost = () => (
    <div className="my-2 h-10 w-full rounded border-2 border-dashed border-blue-400 bg-blue-50/70 dark:bg-blue-900/20" />
  );
  const isDraggingSource = draggingId === n.id;
  return (
    <li
      ref={liRef}
      className={`rounded border p-3 dark:border-slate-700 bg-white dark:bg-slate-900 group ${isDropTarget && dropMode === "inside" ? 'border-blue-400 ring-1 ring-blue-300' : 'border-slate-200'} ${isDraggingSource ? 'opacity-40' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnter={handleDragEnter}
      onDrop={onDrop}
    >
      {/* Removed interior above ghost (redundant with external gap zone) */}
      {isOutdentTarget ? (
        <div className="-mt-3 mb-2 flex items-center gap-2 text-xs text-blue-400">
          <div className="h-0.5 w-full bg-blue-500" />
          <span className="shrink-0">Outdent here</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="rounded border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="px-2 py-0.5 text-[10px] text-slate-400">•</span>
          )}
          <div
            className="cursor-grab rounded border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
            draggable
            onDragStart={(e) => onDragStart(e, n.id, liRef.current)}
            title="Drag to move / nest"
          >::</div>
          <span className={`font-medium ${effectiveHidden ? 'opacity-50 line-through' : 'text-slate-900 dark:text-slate-100'}`}>{n.labels?.bg || n.labels?.en || n.slug || n.externalUrl || n.id}</span>
        </div>
        {/* Show per-level position (sibling index) instead of raw order */}
        <SiblingPositionBadge node={n} fullTree={fullTree} />
        <span className="text-xs text-slate-500">{n.slug ? `/${n.slug}` : n.externalUrl ?? ""}</span>
        <label className="ml-auto flex items-center gap-1 text-xs">
          <input className="accent-blue-600 dark:accent-blue-500" type="checkbox" checked={n.visible} disabled={ancestorHidden} onChange={(e) => onUpdate(n.id, { visible: e.target.checked })} />
          <span className="text-slate-600 dark:text-slate-400">Visible</span>
        </label>
        
        {n.slug ? (
          <div className="flex items-center gap-1">
            <button className="rounded border px-2 py-0.5 text-xs dark:border-slate-600" onClick={goToEditAny} title="Edit">Edit</button>
            <button
              className="rounded border px-2 py-0.5 text-xs dark:border-slate-600"
              title="Preview (BG)"
              onClick={async () => {
                try {
                  const pageIdBg: string | undefined = (n.meta as any)?.pageIdByLocale?.bg;
                  let slugToOpen: string | undefined;
                  if (pageIdBg) {
                    const res = await fetch(`/api/admin/pages/${pageIdBg}`, { cache: "no-store" });
                    if (res.ok) {
                      const data = await res.json();
                      slugToOpen = (data?.page?.slug || "").trim();
                    }
                  }
                  if (!slugToOpen) {
                    const slugBg = (((n.meta as any)?.slugByLocale?.bg ?? n.slug) || "").trim();
                    slugToOpen = slugBg;
                  }
                  const href = !slugToOpen || slugToOpen === "home" ? "/bg" : `/bg/${slugToOpen}`;
                  window.open(href, "_blank");
                } catch {
                  const slugBg = (((n.meta as any)?.slugByLocale?.bg ?? n.slug) || "").trim();
                  const href = !slugBg || slugBg === "home" ? "/bg" : `/bg/${slugBg}`;
                  window.open(href, "_blank");
                }
              }}
            >Preview</button>
          </div>
        ) : null}
        <button className="rounded border px-2 py-0.5 text-xs dark:border-slate-600 disabled:opacity-50" disabled={atTop} onClick={moveUpLevel}>Up</button>
        <button className="rounded border px-2 py-0.5 text-xs dark:border-slate-600 disabled:opacity-50" disabled={atBottom} onClick={moveDownLevel}>Down</button>
        <button className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 dark:border-red-600 dark:text-red-300" onClick={() => onDelete(n.id)}>Delete</button>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="text-xs">
          <div className="text-slate-600 dark:text-slate-300">Label (bg)</div>
          <input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={n.labels?.bg ?? ""} onChange={(e) => onUpdate(n.id, { labels: { ...n.labels, bg: e.target.value } as any })} />
        </label>
        <label className="text-xs">
          <div className="text-slate-600 dark:text-slate-300">Label (en)</div>
          <input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={n.labels?.en ?? ""} onChange={(e) => onUpdate(n.id, { labels: { ...n.labels, en: e.target.value } as any })} />
        </label>
        <label className="text-xs">
          <div className="text-slate-600 dark:text-slate-300">Slug or URL</div>
          <input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={n.slug ?? n.externalUrl ?? ""} onChange={(e) => {
            const v = e.target.value;
            if (v.startsWith("http")) onUpdate(n.id, { slug: null as any, externalUrl: v });
            else onUpdate(n.id, { slug: v, externalUrl: null as any });
          }} />
        </label>
        <label className="text-xs">
          <div className="text-slate-600 dark:text-slate-300">Slug override (bg)</div>
          <input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={(n.meta as any)?.slugByLocale?.bg ?? ""} onChange={(e) => {
            const curr = (n.meta as any) || {};
            const next = { ...curr, slugByLocale: { ...(curr.slugByLocale || {}), bg: e.target.value || undefined } };
            onUpdate(n.id, { meta: next as any });
          }} />
        </label>
        <label className="text-xs">
          <div className="text-slate-600 dark:text-slate-300">Slug override (en)</div>
          <input className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={(n.meta as any)?.slugByLocale?.en ?? ""} onChange={(e) => {
            const curr = (n.meta as any) || {};
            const next = { ...curr, slugByLocale: { ...(curr.slugByLocale || {}), en: e.target.value || undefined } };
            onUpdate(n.id, { meta: next as any });
          }} />
        </label>
        <label className="text-xs">
          <div className="text-slate-600 dark:text-slate-300">Target Page ID (bg)</div>
          <input
            className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            value={(n.meta as any)?.pageIdByLocale?.bg ?? ""}
            onChange={(e) => {
              const curr = (n.meta as any) || {};
              const next = { ...curr, pageIdByLocale: { ...(curr.pageIdByLocale || {}), bg: e.target.value || undefined } };
              onUpdate(n.id, { meta: next as any });
            }}
            placeholder="optional: page id for BG"
          />
        </label>
        <label className="text-xs">
          <div className="text-slate-600 dark:text-slate-300">Target Page ID (en)</div>
          <input
            className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            value={(n.meta as any)?.pageIdByLocale?.en ?? ""}
            onChange={(e) => {
              const curr = (n.meta as any) || {};
              const next = { ...curr, pageIdByLocale: { ...(curr.pageIdByLocale || {}), en: e.target.value || undefined } };
              onUpdate(n.id, { meta: next as any });
            }}
            placeholder="optional: page id for EN"
          />
        </label>
        <label className="text-xs sm:col-span-3">
          <div className="text-slate-600 dark:text-slate-300">Parent</div>
          <select
            className="w-full rounded border px-2 py-1 text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            value={n.parentId || ""}
            onChange={(e) => onUpdate(n.id, { parentId: e.target.value || null, order: 0 })}
          >
            <option value="">(root)</option>
            {flatNodes
              .filter(p => p.id !== n.id && !descendants.has(p.id))
              .map(p => (
                <option key={p.id} value={p.id}>{p.labels?.bg || p.labels?.en || p.slug || p.externalUrl || p.id}</option>
              ))}
          </select>
        </label>
      </div>
      {isDropTarget && dropMode === "inside" && expanded && draggingId !== n.id ? (
        <div className="mt-2 border-l border-slate-200 pl-4 dark:border-slate-700">
          <Ghost />
        </div>
      ) : null}
      {hasChildren && expanded ? (
        <div className="mt-2 border-l border-slate-200 pl-4 dark:border-slate-700">
          <NavTree
            nodes={n.children}
            fullTree={fullTree}
            flatNodes={flatNodes}
            parentId={n.id}
            draggingId={draggingId}
            dropTargetId={dropTargetId}
            dropMode={dropMode}
            setDraggingId={setDraggingId}
            setDropTargetId={setDropTargetId}
            setDropMode={setDropMode}
            ancestorHidden={effectiveHidden}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      ) : null}
      {/* Removed interior below ghost (redundant with external gap/end zones) */}
    </li>
  );
}

function SiblingPositionBadge({ node, fullTree }: { node: NavNode; fullTree: NavNode[] }) {
  function findById(list: NavNode[], id: string): NavNode | null {
    for (const it of list) {
      if (it.id === id) return it;
      const f = findById(it.children || [], id);
      if (f) return f;
    }
    return null;
  }
  const siblings: NavNode[] = node.parentId ? (findById(fullTree, node.parentId)?.children || []) : fullTree;
  const sorted = [...siblings].sort((a, b) => a.order - b.order);
  const pos = Math.max(0, sorted.findIndex(s => s.id === node.id)) + 1;
  return (
    <span className="text-xs text-slate-500" title={`Sibling position within level`}>pos {pos}</span>
  );
}
