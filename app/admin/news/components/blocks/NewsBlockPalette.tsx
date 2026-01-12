"use client";

import React, { useState } from "react";
import { Search, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import {
  newsBlockMeta,
  newsBlockCategories,
  getNewsBlockIcon,
} from "./block-meta";
import type { NewsBlockCategory, NewsBlockMeta } from "./types";

interface NewsBlockPaletteProps {
  onAddBlock: (blockType: string) => void;
}

function BlockItem({
  block,
  onAddBlock,
}: {
  block: NewsBlockMeta;
  onAddBlock: (blockType: string) => void;
}) {
  const Icon = getNewsBlockIcon(block.icon);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-news-block-type", block.type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAddBlock(block.type)}
      className="group flex w-full items-center gap-3 rounded-lg border border-transparent bg-white p-3 text-left transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-sm active:cursor-grabbing dark:bg-slate-800 dark:hover:border-brand-600 dark:hover:bg-brand-950/30"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200 transition-colors group-hover:bg-brand-100 group-hover:ring-brand-300 dark:bg-slate-700 dark:ring-slate-600 dark:group-hover:bg-brand-900/50 dark:group-hover:ring-brand-500">
        <Icon className="h-5 w-5 text-slate-600 group-hover:text-brand-600 dark:text-slate-300 dark:group-hover:text-brand-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {block.label}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {block.description}
        </p>
      </div>
      <GripVertical className="h-4 w-4 flex-shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
    </button>
  );
}

function CategorySection({
  category,
  blocks,
  onAddBlock,
  defaultExpanded = true,
}: {
  category: NewsBlockCategory;
  blocks: NewsBlockMeta[];
  onAddBlock: (blockType: string) => void;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const categoryInfo = newsBlockCategories[category];
  const CategoryIcon = categoryInfo.icon;

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
        <CategoryIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {categoryInfo.label}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {blocks.length}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-1 pl-2">
          {blocks.map((block) => (
            <BlockItem key={block.type} block={block} onAddBlock={onAddBlock} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NewsBlockPalette({ onAddBlock }: NewsBlockPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBlocks = newsBlockMeta.filter((block) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      block.label.toLowerCase().includes(query) ||
      block.description.toLowerCase().includes(query) ||
      block.type.toLowerCase().includes(query)
    );
  });

  const categories: NewsBlockCategory[] = ["text", "media", "layout", "embed"];

  const blocksByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = filteredBlocks.filter((b) => b.category === category);
      return acc;
    },
    {} as Record<NewsBlockCategory, NewsBlockMeta[]>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-700">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Content Blocks
        </h3>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Block List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {categories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              blocks={blocksByCategory[category]}
              onAddBlock={onAddBlock}
              defaultExpanded={category === "text"}
            />
          ))}
        </div>

        {filteredBlocks.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No blocks match "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Click to add or drag blocks to the canvas
        </p>
      </div>
    </div>
  );
}
