"use client";

import React, { useEffect, useMemo, useState, useRef, DragEvent } from "react";
import Panel from "@/components/admin/Panel";
import { blockRegistry, validateBlocks, type BlockInstance } from "@/lib/blocks/registry";

type Props = {
  value: string; // JSON text (array of blocks)
  onChange: (nextText: string) => void;
};

function pretty(blocks: BlockInstance[]) {
  return JSON.stringify(blocks, null, 2);
}

function coerceBlocks(value: string): { blocks: BlockInstance[]; error?: string } {
  if (!value.trim()) return { blocks: [] };
  try {
    const arr = JSON.parse(value);
    if (!Array.isArray(arr)) return { blocks: [], error: "Blocks must be a JSON array" };
    const v = validateBlocks(arr);
    if (!v.valid) return { blocks: v.normalized, error: v.errors.join("\n") };
    return { blocks: v.normalized };
  } catch (e: any) {
    return { blocks: [], error: e?.message || "Invalid JSON" };
  }
}

const KNOWN_TYPES = ["Hero", "Section", "Markdown", "NewsList", "Testimonials", "AdmissionsTimeline", "CTA", "Grid", "MediaGallery"] as const;

function defaultBlock(type: string): BlockInstance {
  switch (type) {
    case "Hero":
      return { type, props: { heading: "Heading", subheading: "", image: "", cta: { label: "Learn more", href: "/" } } };
    case "Section":
      return { type, props: { title: "Section", description: "", markdown: "" } };
    case "Markdown":
      return { type, props: { value: "Write some **markdown**" } };
    case "NewsList":
      return { type, props: { title: "News", description: "", limit: 6 } };
    default:
      return { type, props: {} };
  }
}

export default function BlockEditor({ value, onChange }: Props) {
  const [error, setError] = useState<string | undefined>(undefined);
  const parsed = useMemo(() => coerceBlocks(value), [value]);
  const [blocks, setBlocks] = useState<BlockInstance[]>(parsed.blocks);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setBlocks(parsed.blocks);
    setError(parsed.error);
  }, [parsed.blocks, parsed.error]);

  function commit(next: BlockInstance[]) {
    setBlocks(next);
    onChange(pretty(next));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = blocks.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    commit(next);
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return;
    const next = blocks.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  }

  const dragIndex = useRef<number | null>(null);
  const overIndex = useRef<number | null>(null);

  function onDragStart(e: DragEvent<HTMLDivElement>, idx: number) {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: DragEvent<HTMLLIElement>, idx: number) {
    e.preventDefault();
    overIndex.current = idx;
  }
  function onDrop() {
    if (dragIndex.current != null && overIndex.current != null) {
      reorder(dragIndex.current, overIndex.current);
    }
    dragIndex.current = null;
    overIndex.current = null;
  }

  function removeAt(idx: number) {
    const next = blocks.slice();
    next.splice(idx, 1);
    commit(next);
  }

  function duplicateAt(idx: number) {
    const next = blocks.slice();
    next.splice(idx + 1, 0, JSON.parse(JSON.stringify(next[idx])));
    commit(next);
  }

  function add(type: string) {
    const next = blocks.concat([defaultBlock(type)]);
    commit(next);
  }

  function updateProps(idx: number, updater: (props: Record<string, unknown>) => Record<string, unknown>) {
    const next = blocks.slice();
    const cur = (next[idx]?.props ?? {}) as Record<string, unknown>;
    next[idx] = { ...next[idx], props: updater({ ...cur }) };
    commit(next);
  }

  const isDirty = pretty(blocks) !== (value || "");

  function toggleCollapse(idx: number) {
    setCollapsed((s) => ({ ...s, [idx]: !s[idx] }));
  }

  function handleKeyboardReorder(e: React.KeyboardEvent, idx: number) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      reorder(idx, Math.max(0, idx - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      reorder(idx, Math.min(blocks.length - 1, idx + 1));
    }
  }

  return (
    <Panel
      title={
        <div className="flex items-center gap-3">
          <span>Blocks Editor</span>
          {error ? <span className="text-xs text-amber-600">{error}</span> : null}
          {isDirty ? <span className="admin-dirty-pill">Unsaved</span> : null}
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <select className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600" id="add-type">
            {KNOWN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="button"
            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white"
            onClick={(e) => {
              const sel = (e.currentTarget.previousSibling as HTMLSelectElement) as HTMLSelectElement | null;
              const type = sel?.value || KNOWN_TYPES[0];
              add(type);
            }}
          >Add block</button>
        </div>
      }
    >
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {blocks.length === 0 ? (
          <li className="p-3 text-sm text-slate-500">No blocks yet. Add one to get started.</li>
        ) : (
          blocks.map((b, idx) => (
            <li
              key={idx}
              className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-5 group admin-block-card"
              draggable
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={onDrop}
            >
              <div className="sm:col-span-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase text-slate-500">Type</div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{b.type}</div>
                  </div>
                  <div
                    className="cursor-grab rounded border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                    draggable
                    onDragStart={(e) => onDragStart(e, idx)}
                    title="Drag to reorder"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyboardReorder(e as any, idx)}
                    aria-label={`Reorder block ${b.type}`}
                  >
                    ::
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 admin-block-actions">
                  <button type="button" className="rounded border px-2 py-0.5 text-xs dark:border-slate-600" onClick={() => move(idx, -1)}>Up</button>
                  <button type="button" className="rounded border px-2 py-0.5 text-xs dark:border-slate-600" onClick={() => move(idx, 1)}>Down</button>
                  <button type="button" className="rounded border px-2 py-0.5 text-xs dark:border-slate-600" onClick={() => duplicateAt(idx)}>Dup</button>
                  <button type="button" className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 dark:border-red-600 dark:text-red-300" onClick={() => removeAt(idx)}>Del</button>
                </div>
              </div>
              <div className="sm:col-span-4">
                {collapsed[idx] ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{b.type} (collapsed)</div>
                      <div>
                        <button className="text-xs rounded border px-2 py-0.5" onClick={() => toggleCollapse(idx)}>Expand</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end justify-end mb-2">
                      <button className="text-xs rounded border px-2 py-0.5 mr-2" onClick={() => toggleCollapse(idx)}>Collapse</button>
                    </div>
                    <BlockPropsEditor block={b} onChange={(next) => updateProps(idx, () => next)} />
                  </div>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </Panel>
  );
}

function inputCls() {
  return "w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 bg-white dark:bg-slate-900";
}

function BlockPropsEditor({ block, onChange }: { block: BlockInstance; onChange: (props: Record<string, unknown>) => void }) {
  const p = (block.props ?? {}) as Record<string, any>;
  const [showPreview, setShowPreview] = useState(false);
  switch (block.type) {
    case "Hero":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-sm">
            <div className="text-slate-600 dark:text-slate-300">Heading</div>
            <input className={inputCls()} value={p.heading ?? ""} onChange={(e) => onChange({ ...p, heading: e.target.value })} />
          </label>
          <label className="text-sm">
            <div className="text-slate-600 dark:text-slate-300">Subheading</div>
            <input className={inputCls()} value={p.subheading ?? ""} onChange={(e) => onChange({ ...p, subheading: e.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">
            <div className="text-slate-600 dark:text-slate-300">Image URL</div>
            <input className={inputCls()} value={p.image ?? ""} onChange={(e) => onChange({ ...p, image: e.target.value })} />
          </label>
          <div className="sm:col-span-2 grid grid-cols-2 gap-2">
            <label className="text-sm">
              <div className="text-slate-600 dark:text-slate-300">CTA Label</div>
              <input className={inputCls()} value={p.cta?.label ?? ""} onChange={(e) => onChange({ ...p, cta: { ...(p.cta ?? {}), label: e.target.value } })} />
            </label>
            <label className="text-sm">
              <div className="text-slate-600 dark:text-slate-300">CTA Href</div>
              <input className={inputCls()} value={p.cta?.href ?? ""} onChange={(e) => onChange({ ...p, cta: { ...(p.cta ?? {}), href: e.target.value } })} />
            </label>
          </div>
        </div>
      );
    case "Section":
      return (
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm">
            <div className="text-slate-600 dark:text-slate-300">Title</div>
            <input className={inputCls()} value={p.title ?? ""} onChange={(e) => onChange({ ...p, title: e.target.value })} />
          </label>
          <label className="text-sm">
            <div className="text-slate-600 dark:text-slate-300">Description</div>
            <input className={inputCls()} value={p.description ?? ""} onChange={(e) => onChange({ ...p, description: e.target.value })} />
          </label>
          <label className="text-sm">
            <div className="flex items-center justify-between">
              <div className="text-slate-600 dark:text-slate-300">Markdown</div>
              <div className="text-xs">
                <button className="mr-2 rounded border px-2 py-0.5 text-xs" onClick={() => setShowPreview((s) => !s)}>{showPreview ? 'Hide preview' : 'Show preview'}</button>
              </div>
            </div>
            <textarea className={inputCls() + " min-h-[100px] font-mono"} value={p.markdown ?? ""} onChange={(e) => onChange({ ...p, markdown: e.target.value })} />
            {showPreview ? <div className="mt-2 admin-preview-pane"><div className="prose prose-slate max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: (typeof p.markdown === 'string' ? p.markdown : '') }} /></div> : null}
          </label>
        </div>
      );
    case "Markdown":
      return (
        <label className="text-sm w-full">
          <div className="flex items-center justify-between">
            <div className="text-slate-600 dark:text-slate-300">Markdown</div>
            <div className="text-xs">
              <button className="rounded border px-2 py-0.5 text-xs" onClick={() => setShowPreview((s) => !s)}>{showPreview ? 'Hide preview' : 'Show preview'}</button>
            </div>
          </div>
          <textarea className={inputCls() + " min-h-[120px] font-mono"} value={p.value ?? ""} onChange={(e) => onChange({ ...p, value: e.target.value })} />
          {showPreview ? <div className="mt-2 admin-preview-pane"><div className="prose prose-slate max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: (typeof p.value === 'string' ? p.value : '') }} /></div> : null}
        </label>
      );
    case "NewsList":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-sm">
            <div className="text-slate-600 dark:text-slate-300">Title</div>
            <input className={inputCls()} value={p.title ?? ""} onChange={(e) => onChange({ ...p, title: e.target.value })} />
          </label>
          <label className="text-sm">
            <div className="text-slate-600 dark:text-slate-300">Description</div>
            <input className={inputCls()} value={p.description ?? ""} onChange={(e) => onChange({ ...p, description: e.target.value })} />
          </label>
          <label className="text-sm">
            <div className="text-slate-600 dark:text-slate-300">Limit</div>
            <input type="number" min={1} max={24} className={inputCls()} value={p.limit ?? 6} onChange={(e) => onChange({ ...p, limit: Number(e.target.value || 0) })} />
          </label>
        </div>
      );
    default:
      return (
        <div className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">
          No editor for this block type yet. Use JSON mode to edit props.
        </div>
      );
  }
}
