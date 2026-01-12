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
    <div className="h-full">
      {/* Error message if locale loading fails */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}
      <NewsManager posts={posts} currentLocale={locale} onLocaleChange={handleLocaleSwitch} isLocaleLoading={loading} />
    </div>
  );
}
