import React from 'react';
import { loadSectionItems } from '@/lib/content';
import { Section } from '@/components/Section';

export default function StudentLifeIndex() {
  const items = loadSectionItems('uchenicheski-zhivot');
  return (
    <Section title="Ученически живот">
      {items.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Няма съдържание.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map(i => (
            <li key={i.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <a className="font-semibold text-brand-600 hover:underline dark:text-brand-400" href={i.href}>{i.title}</a>
              {i.excerpt && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{i.excerpt}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}


