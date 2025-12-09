"use client";

import React, { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  MoreVertical,
  Settings,
} from "lucide-react";
import { usePageBuilder } from "./PageBuilderContext";
import { getBlockMeta, getBlockIcon } from "./block-meta";
import { renderBlockInstance } from "@/lib/blocks/registry";
import type { BlockInstance } from "./types";

type BlockWrapperProps = {
  block: BlockInstance;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (isHovering: boolean) => void;
};

export function BlockWrapper({
  block,
  index,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: BlockWrapperProps) {
  const {
    state,
    dispatch,
    removeBlock,
    duplicateBlock,
    moveBlock,
  } = usePageBuilder();
  const [showMenu, setShowMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const blockRef = useRef<HTMLDivElement>(null);
  
  const meta = getBlockMeta(block.type);
  const Icon = meta ? getBlockIcon(meta.icon) : null;
  const totalBlocks = state.blocks.length;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-block-id", block.id);
    e.dataTransfer.setData("application/x-block-index", String(index));
    e.dataTransfer.effectAllowed = "move";
    dispatch({ type: 'START_DRAG', source: { type: 'canvas', blockId: block.id, index } });
  };

  const handleDragEnd = () => {
    dispatch({ type: 'END_DRAG' });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = blockRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    dispatch({ type: 'SET_DROP_TARGET', target: { index, position } });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const blockType = e.dataTransfer.getData("application/x-block-type");
    const fromId = e.dataTransfer.getData("application/x-block-id");
    const fromIndex = e.dataTransfer.getData("application/x-block-index");
    
    const { dropTarget } = state;
    if (!dropTarget) return;
    
    const insertIndex = dropTarget.position === 'after' ? dropTarget.index + 1 : dropTarget.index;
    
    if (blockType) {
      // New block from palette
      dispatch({ type: 'ADD_BLOCK', blockType, index: insertIndex });
    } else if (fromId && fromIndex) {
      // Existing block being moved
      const from = parseInt(fromIndex);
      const to = insertIndex > from ? insertIndex - 1 : insertIndex;
      if (from !== to) {
        moveBlock(from, to);
      }
    }
    
    dispatch({ type: 'END_DRAG' });
  };

  // Determine drop indicator position
  const showDropBefore = state.isDragging && state.dropTarget?.index === index && state.dropTarget.position === 'before';
  const showDropAfter = state.isDragging && state.dropTarget?.index === index && state.dropTarget.position === 'after';

  return (
    <div
      ref={blockRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Drop indicator - before */}
      {showDropBefore && (
        <div className="absolute -top-1 left-0 right-0 z-20 h-1 rounded-full bg-brand-500 shadow-lg shadow-brand-500/50" />
      )}

      {/* Block container */}
      <div
        onClick={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        className={`
          group relative rounded-xl border-2 transition-all
          ${isSelected
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
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="cursor-grab rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Block type label */}
          <div className="flex items-center gap-1.5 px-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            {Icon && <Icon className="h-3.5 w-3.5 text-slate-500" />}
            <span>{meta?.label || block.type}</span>
          </div>

          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-600" />

          {/* Move up */}
          <button
            onClick={(e) => { e.stopPropagation(); if (index > 0) moveBlock(index, index - 1); }}
            disabled={index === 0}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          {/* Move down */}
          <button
            onClick={(e) => { e.stopPropagation(); if (index < totalBlocks - 1) moveBlock(index, index + 1); }}
            disabled={index === totalBlocks - 1}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-600" />

          {/* Toggle preview */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowPreview(!showPreview); }}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title={showPreview ? "Hide preview" : "Show preview"}
          >
            {showPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>

          {/* Duplicate */}
          <button
            onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>

          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
            className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Block content */}
        <div className="relative overflow-hidden rounded-lg">
          {showPreview ? (
            <div className="pointer-events-none">
              {renderBlockInstance({ type: block.type, props: block.props })}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 bg-slate-100 py-12 dark:bg-slate-800">
              {Icon && <Icon className="h-8 w-8 text-slate-400" />}
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">{meta?.label || block.type}</p>
                <p className="text-sm text-slate-500">{meta?.description}</p>
              </div>
            </div>
          )}
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
export function EmptyCanvas() {
  const { dispatch } = usePageBuilder();
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
    
    const blockType = e.dataTransfer.getData("application/x-block-type");
    if (blockType) {
      dispatch({ type: 'ADD_BLOCK', blockType, index: 0 });
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors
        ${isDragOver
          ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/30"
          : "border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30"
        }
      `}
    >
      <div className={`
        mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors
        ${isDragOver ? "bg-brand-100 dark:bg-brand-900/50" : "bg-slate-100 dark:bg-slate-800"}
      `}>
        <Plus className={`h-8 w-8 ${isDragOver ? "text-brand-600" : "text-slate-400"}`} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
        Start building your page
      </h3>
      <p className="mb-4 max-w-sm text-slate-500 dark:text-slate-400">
        Drag blocks from the sidebar or click the button below to add your first block
      </p>
      <p className={`text-sm ${isDragOver ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`}>
        {isDragOver ? "Drop to add block" : "Drag & drop a block here"}
      </p>
    </div>
  );
}
