"use client";

import React, { useRef, useState } from "react";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  Settings,
} from "lucide-react";
import { getNewsBlockMeta, getNewsBlockIcon } from "./block-meta";
import type { NewsBlockInstance } from "./types";

interface NewsBlockWrapperProps {
  block: NewsBlockInstance;
  index: number;
  totalBlocks: number;
  isSelected: boolean;
  isHovered: boolean;
  isDragging: boolean;
  dropPosition: "before" | "after" | null;
  onSelect: () => void;
  onHover: (isHovering: boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  children: React.ReactNode;
}

export function NewsBlockWrapper({
  block,
  index,
  totalBlocks,
  isSelected,
  isHovered,
  isDragging,
  dropPosition,
  onSelect,
  onHover,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  children,
}: NewsBlockWrapperProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const meta = getNewsBlockMeta(block.type);
  const Icon = meta ? getNewsBlockIcon(meta.icon) : Settings;

  const showDropBefore = isDragging && dropPosition === "before";
  const showDropAfter = isDragging && dropPosition === "after";

  return (
    <div
      ref={blockRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="relative"
    >
      {/* Drop indicator - before */}
      {showDropBefore && (
        <div className="absolute -top-1 left-0 right-0 z-20 h-1 rounded-full bg-brand-500 shadow-lg shadow-brand-500/50" />
      )}

      {/* Block container */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        className={`
          group relative rounded-xl border-2 transition-all
          ${
            isSelected
              ? "border-brand-500 bg-brand-50/30 ring-4 ring-brand-500/10 dark:bg-brand-950/20"
              : isHovered
                ? "border-brand-300 bg-slate-50/50 dark:border-brand-600 dark:bg-slate-800/50"
                : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          }
        `}
      >
        {/* Block toolbar */}
        <div
          className={`
            absolute -top-10 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-white px-1.5 py-1 shadow-lg ring-1 ring-slate-200 transition-all dark:bg-slate-800 dark:ring-slate-700
            ${isSelected || isHovered ? "opacity-100" : "pointer-events-none opacity-0"}
          `}
        >
          {/* Drag handle */}
          <button
            type="button"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="cursor-grab rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Block type label */}
          <div className="flex items-center gap-1.5 px-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Icon className="h-3.5 w-3.5 text-slate-500" />
            <span>{meta?.label || block.type}</span>
          </div>

          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-600" />

          {/* Move up */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          {/* Move down */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === totalBlocks - 1}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-600" />

          {/* Duplicate */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Block content */}
        <div className="relative overflow-hidden rounded-lg p-4">
          {children}
        </div>

        {/* Selection indicator - left edge */}
        {isSelected && (
          <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-brand-500" />
        )}
      </div>

      {/* Drop indicator - after */}
      {showDropAfter && (
        <div className="absolute -bottom-1 left-0 right-0 z-20 h-1 rounded-full bg-brand-500 shadow-lg shadow-brand-500/50" />
      )}
    </div>
  );
}

// Empty state / drop zone
interface EmptyCanvasProps {
  onDrop: (e: React.DragEvent) => void;
}

export function EmptyNewsCanvas({ onDrop }: EmptyCanvasProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors
        ${
          isDragOver
            ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/30"
            : "border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30"
        }
      `}
    >
      <div
        className={`
        mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-colors
        ${isDragOver ? "bg-brand-100 dark:bg-brand-900/50" : "bg-slate-100 dark:bg-slate-800"}
      `}
      >
        <Settings
          className={`h-7 w-7 ${isDragOver ? "text-brand-600" : "text-slate-400"}`}
        />
      </div>
      <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">
        Start building your article
      </h3>
      <p className="mb-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">
        Drag blocks from the sidebar or click on a block to add it
      </p>
      <p
        className={`text-sm ${isDragOver ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}
      >
        {isDragOver ? "Drop to add block" : "Drag & drop a block here"}
      </p>
    </div>
  );
}
