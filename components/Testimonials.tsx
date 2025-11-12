"use client";

import React from "react";
import { Reveal } from "./Reveal";

export interface Testimonial {
  name: string;
  role?: string;
  quote: string;
  image?: string;
}

export function Testimonials({ title, subtitle, items }: {
  title?: string;
  subtitle?: string;
  items: Testimonial[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <section className="container-page py-8">
      {title && <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
      {subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <Reveal key={i}>
            <figure className="relative flex h-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-subtle transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
              {/* single subtle depth layer */}
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-to-b from-white/60 to-white/30 dark:from-slate-800/60 dark:to-slate-800/30" />
              {/* brand accent bar */}
              <div aria-hidden className="absolute inset-x-6 top-0 h-[3px] rounded-b bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 dark:from-brand-500 dark:via-brand-400 dark:to-brand-500" />
              {/* decorative quote */}
              <div aria-hidden className="absolute left-6 top-4 text-4xl font-bold leading-none text-brand-600/15 dark:text-brand-400/20 select-none">“</div>
              <blockquote className="relative mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                {t.quote}
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-4 pt-2">
                {t.image ? (
                  <img
                    src={t.image}
                    alt={t.name}
                    loading="lazy"
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-600/30 dark:ring-brand-400/30"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-base font-semibold text-white ring-2 ring-brand-600/40 dark:from-brand-500 dark:to-brand-700 dark:ring-brand-400/40">
                    {t.name?.charAt(0) ?? "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                  {t.role && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.role}</p>}
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
