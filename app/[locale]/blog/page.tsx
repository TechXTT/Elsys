import React from "react";
import { getTranslations } from "next-intl/server";

import { PostCard } from "@/components/post-card";
import { Section } from "@/components/Section";
import type { Locale } from "@/i18n/config";
import { loadBlogJson } from "@/lib/content";

export default async function BlogIndex({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tBlog] = await Promise.all([
    getTranslations({ locale, namespace: "Blog" }),
  ]);
  const posts = loadBlogJson(locale);
  return (
    <Section title={tBlog("title")}>
      {posts.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{tBlog("empty")}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} locale={locale} />
          ))}
        </div>
      )}
    </Section>
  );
}


