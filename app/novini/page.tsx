import React from 'react';
import { loadNewsJson } from '@/lib/content';
import { Section } from '@/components/Section';
import { NewsCard } from '@/components/news-card';

export default function NewsIndex() {
  const news = loadNewsJson();
  return (
    <Section title="Новини">
      {news.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Няма новини.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map(n => <NewsCard key={n.id} post={n} />)}
        </div>
      )}
    </Section>
  );
}


