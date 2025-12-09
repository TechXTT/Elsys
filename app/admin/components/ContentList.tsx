"use client";

import Link from "next/link";
import { formatDistanceToNow } from "@/app/admin/utils/date";

interface ContentItem {
  id: string;
  title: string;
  slug?: string;
  status: "published" | "draft";
  locale?: string;
  updatedAt: Date | string;
  author?: string | null;
}

interface ContentListProps {
  items: ContentItem[];
  type: "news" | "page";
  emptyMessage?: string;
}

export function ContentList({ items, type, emptyMessage = "No items found" }: ContentListProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item) => {
        const date = typeof item.updatedAt === "string" ? new Date(item.updatedAt) : item.updatedAt;
        const href = type === "news" ? `/admin/news?edit=${item.id}` : `/admin/pages/${item.id}`;

        return (
          <Link
            key={item.id}
            href={href as any}
            className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {item.title}
                </span>
                {item.locale && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {item.locale}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.status === "published"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                {item.slug && <span className="truncate">/{item.slug}</span>}
                {item.author && (
                  <>
                    <span>•</span>
                    <span>{item.author}</span>
                  </>
                )}
                <span>•</span>
                <span>{formatDistanceToNow(date)}</span>
              </div>
            </div>
            <span className="text-slate-400">→</span>
          </Link>
        );
      })}
    </div>
  );
}
