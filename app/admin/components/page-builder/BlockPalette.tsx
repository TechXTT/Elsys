"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Search,
  Plus,
} from "lucide-react";
import { usePageBuilder } from "./PageBuilderContext";
import { blockMeta, blockCategories, getBlockIcon, getBlocksByCategory } from "./block-meta";
import type { BlockCategory, BlockMeta } from "./types";

type BlockPaletteProps = {
  onAddBlock?: (type: string) => void;
  /** "simple" shows only the teacher-friendly block subset; "advanced" shows all. */
  mode?: "simple" | "advanced";
};

// Teacher-friendly subset surfaced in Опростен (simple) mode.
const SIMPLE_BLOCKS = new Set([
  "Hero", "Section", "Markdown", "Stats", "Quote", "MediaGallery",
  "NewsList", "TeamGrid", "PartnerGrid", "DocumentList", "ClubGrid", "CTA",
]);

function BlockItem({ block, onAdd }: { block: BlockMeta; onAdd: () => void }) {
  const Icon = getBlockIcon(block.icon);
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-block-type", block.type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onAdd}
      className="group flex cursor-grab items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] p-2.5 transition-all hover:border-[var(--color-action-secondary-border)] hover:bg-[var(--color-bg-brand-tint)] active:cursor-grabbing"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-surface)] text-[var(--color-text-link)] ring-1 ring-[var(--color-border-default)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-[var(--color-text-heading)]">
          {block.label}
        </p>
        <p className="text-caption truncate text-[var(--color-text-muted)]">
          {block.description}
        </p>
      </div>
      <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4 text-[var(--color-text-muted)]" />
      </div>
    </div>
  );
}

function CategorySection({
  category,
  blocks,
  onAddBlock,
  defaultOpen = false,
}: {
  category: BlockCategory;
  blocks: BlockMeta[];
  onAddBlock: (type: string) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const categoryInfo = blockCategories[category];
  const CategoryIcon = categoryInfo.icon;

  return (
    <div className="border-b border-[var(--color-border-default)] last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-subtle)]"
      >
        <CategoryIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
        <span className="text-body-sm flex-1 font-medium text-[var(--color-text-body)]">
          {categoryInfo.label}
        </span>
        <span className="text-caption text-[var(--color-text-muted)]">{blocks.length}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
        )}
      </button>
      {isOpen && (
        <div className="space-y-1.5 px-3 pb-3">
          {blocks.map((block) => (
            <BlockItem
              key={block.type}
              block={block}
              onAdd={() => onAddBlock(block.type)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BlockPalette({ onAddBlock, mode = "advanced" }: BlockPaletteProps) {
  const { addBlock } = usePageBuilder();
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddBlock = (type: string) => {
    if (onAddBlock) {
      onAddBlock(type);
    } else {
      addBlock(type);
    }
  };

  const inMode = (type: string) => mode === "advanced" || SIMPLE_BLOCKS.has(type);
  const categories = Object.keys(blockCategories) as BlockCategory[];

  // Filter blocks by search (within the active mode subset)
  const filteredBlocks = searchQuery.trim()
    ? blockMeta.filter(
        (b) =>
          inMode(b.type) &&
          (b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.type.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-[var(--color-border-default)] p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-body-sm w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] py-2 pl-9 pr-3 text-[var(--color-text-body)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-action-secondary-border)] focus:outline-none"
          />
        </div>
      </div>

      {/* Blocks list */}
      <div className="flex-1 overflow-y-auto">
        {filteredBlocks ? (
          // Search results
          <div className="p-3">
            {filteredBlocks.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No blocks found for "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredBlocks.map((block) => (
                  <BlockItem
                    key={block.type}
                    block={block}
                    onAdd={() => handleAddBlock(block.type)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Category sections (filtered by mode; empty categories hidden)
          categories
            .map((cat) => ({ cat, blocks: getBlocksByCategory(cat).filter((b) => inMode(b.type)) }))
            .filter(({ blocks }) => blocks.length > 0)
            .map(({ cat, blocks }, idx) => (
              <CategorySection
                key={cat}
                category={cat}
                blocks={blocks}
                onAddBlock={handleAddBlock}
                defaultOpen={idx === 0}
              />
            ))
        )}
      </div>

      {/* Quick add hint */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-700">
        <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <GripVertical className="h-3 w-3" />
          <span>Drag blocks to add them</span>
        </p>
      </div>
    </div>
  );
}
