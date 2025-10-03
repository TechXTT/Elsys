import React from 'react';

interface SectionProps { title: string; description?: string; children: React.ReactNode }

export const Section: React.FC<SectionProps> = ({ title, description, children }) => (
  <section className="container-page my-10">
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
    </div>
    {children}
  </section>
);
