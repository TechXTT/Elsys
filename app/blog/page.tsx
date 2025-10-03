import React from 'react';
import { loadBlogJson } from '@/lib/content';
import { Section } from '@/components/Section';
import { PostCard } from '@/components/post-card';

export default function BlogIndex() {
  const posts = loadBlogJson();
  return (
    <Section title="Блог">
      {posts.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Няма публикации.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </Section>
  );
}


