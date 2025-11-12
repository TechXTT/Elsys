"use client";

import { useCallback, useEffect, useState } from "react";
import { NewsManager } from "./news-manager";
import type { PostItem } from "@/lib/types";

interface Props {
  initialPosts: PostItem[];
  initialLocale: string;
}

export function NewsAdminShell({ initialPosts, initialLocale }: Props) {
  const [locale, setLocale] = useState(initialLocale);
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (nextLocale: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/news?locale=${encodeURIComponent(nextLocale)}`);
      const payload = await res.json().catch(() => null) as { posts?: PostItem[]; error?: string } | null;
      if (!res.ok || !payload?.posts) {
        setError(payload?.error ?? "Failed to load posts");
        return;
      }
      setPosts(payload.posts);
    } catch (e) {
      setError("Error loading posts");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleLocaleSwitch(next: string) {
    if (next === locale) return;
    setLocale(next);
    fetchPosts(next);
  }

  useEffect(() => {
    // If initialLocale changes (via server), ensure state matches
    if (initialLocale !== locale) {
      setLocale(initialLocale);
      setPosts(initialPosts);
    }
  }, [initialLocale, initialPosts]);

  return (
    <div className="space-y-6">
      <div className="fixed left-2 bottom-8 z-50 pointer-events-none">
        <div className="relative inline-block">
          <span className="sr-only" id="locale-switch-label">Locale</span>
          <div
            role="group"
            aria-labelledby="locale-switch-label"
            className="inline-flex overflow-hidden rounded-xl border border-slate-200/60 bg-white/70 text-xs backdrop-blur-sm shadow-sm dark:border-slate-700/50 dark:bg-slate-800/60 pointer-events-auto"
          >
            <button
              type="button"
              aria-pressed={locale === "bg"}
              onClick={() => handleLocaleSwitch("bg")}
              className={`px-3 py-1.5 font-medium outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 ${
                locale === "bg"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                  : "bg-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-slate-100"
              }`}
            >
              BG
            </button>
            <button
              type="button"
              aria-pressed={locale === "en"}
              onClick={() => handleLocaleSwitch("en")}
              className={`px-3 py-1.5 font-medium outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-blue-500 ${
                locale === "en"
                  ? "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                  : "bg-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-slate-100"
              }`}
            >
              EN
            </button>
          </div>
          {(loading || error) && (
            <div className="absolute left-0 right-0 top-full mt-1 pl-1 text-xs leading-5 pointer-events-none">
            {loading && (
              <div className="text-slate-600 dark:text-slate-400 animate-pulse">Loading…</div>
            )}
            {error && (
              <div className="text-red-600 font-medium">{error}</div>
            )}
            </div>
          )}
        </div>
      </div>
      <NewsManager posts={posts} currentLocale={locale} onLocaleChange={handleLocaleSwitch} />
    </div>
  );
}
