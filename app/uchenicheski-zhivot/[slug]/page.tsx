import React from 'react';
import { loadSectionItems } from '@/lib/content';

export default function StudentLifeDetail({ params }: { params: { slug: string } }) {
  const items = loadSectionItems('uchenicheski-zhivot');
  const item = items.find(i => i.href.endsWith(params.slug));
  if (!item) return <div className="container-page py-20">Страницата не е намерена.</div>;
  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.title}</h1>
      {item.excerpt && <p className="mt-2 text-slate-600 dark:text-slate-400">{item.excerpt}</p>}
      {item.body ? (
        <article className="prose prose-slate mt-6 max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: item.body }} />
      ) : (
        <div className="mt-6 text-sm text-slate-500">Скоро повече информация.</div>
      )}
    </div>
  );
}


