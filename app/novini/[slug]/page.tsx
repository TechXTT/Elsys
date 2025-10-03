import React from 'react';
import { loadNewsJson } from '@/lib/content';

export default function NewsDetail({ params }: { params: { slug: string } }) {
  const all = loadNewsJson();
  const item = all.find(p => p.href.endsWith(params.slug));
  if (!item) return <div className="container-page py-20">Публикацията не е намерена.</div>;
  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.title}</h1>
      {item.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{item.excerpt}</p>}
      <div className="mt-6 text-sm text-slate-500">Това е демо съдържание.</div>
    </div>
  );
}


