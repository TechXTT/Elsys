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
};

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
      className="group flex cursor-grab items-center gap-3 rounded-lg border border-transparent bg-slate-50 p-2.5 transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-sm active:cursor-grabbing dark:bg-slate-800/50 dark:hover:border-brand-600 dark:hover:bg-brand-950/30"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/60 transition-colors group-hover:bg-brand-100 group-hover:text-brand-600 group-hover:ring-brand-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600 dark:group-hover:bg-brand-900/50 dark:group-hover:text-brand-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {block.label}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {block.description}
        </p>
      </div>
      <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4 text-slate-400" />
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
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <CategoryIcon className="h-4 w-4 text-slate-500" />
        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          {categoryInfo.label}
        </span>
        <span className="text-xs text-slate-400">{blocks.length}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
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

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const { addBlock } = usePageBuilder();
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddBlock = (type: string) => {
    if (onAddBlock) {
      onAddBlock(type);
    } else {
      addBlock(type);
    }
  };

  const categories = Object.keys(blockCategories) as BlockCategory[];

  // Filter blocks by search
  const filteredBlocks = searchQuery.trim()
    ? blockMeta.filter(
        (b) =>
          b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-slate-200 p-3 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-brand-500"
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
          // Category sections
          categories.map((cat, idx) => (
            <CategorySection
              key={cat}
              category={cat}
              blocks={getBlocksByCategory(cat)}
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
