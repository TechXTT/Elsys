"use client";

import React from "react";
import { Compass, FileText, Pencil, GraduationCap, BarChart3, Rocket, Calendar } from "lucide-react";
import { Reveal } from "./Reveal";

export interface StepItem {
  title: string;
  description?: string;
  dateHint?: string;
  icon?: string;
  cta?: { label: string; href: string };
}

export function AdmissionsSteps({ title, description, steps, ctaLabel, ctaHref }: {
  title?: string;
  description?: string;
  steps: StepItem[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  if (!steps || steps.length === 0) return null;
  return (
    <section className="container-page py-10">
      {title && <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
      {description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      <div className="relative mt-6 rounded-xl bg-gradient-to-b from-brand-300/10 to-transparent p-1 dark:from-brand-300/15">
        {/* Timeline vertical line */}
        <div className="pointer-events-none absolute left-[1.25rem] top-6 bottom-6 w-px bg-gradient-to-b from-brand-400/40 via-slate-300/40 to-transparent dark:from-brand-300/40 dark:via-slate-600/40" aria-hidden="true" />
        <ol className="space-y-3 p-1">
          {steps.map((s, i) => {
            const IconCmp = (s.icon === "Compass" && Compass)
              || (s.icon === "FileText" && FileText)
              || (s.icon === "Pencil" && Pencil)
              || (s.icon === "GraduationCap" && GraduationCap)
              || (s.icon === "BarChart3" && BarChart3)
              || (s.icon === "Rocket" && Rocket)
              || null;
            return (
              <Reveal key={i}>
                <li className="relative flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-subtle transition hover:border-brand-400/60 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                  <div className="relative mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-center text-xs font-semibold leading-6 text-white ring-2 ring-white/60 dark:ring-slate-800">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                      {IconCmp ? <IconCmp className="h-4 w-4 text-brand-600 dark:text-brand-400" /> : null}
                      <span>{s.title}</span>
                    </p>
                    {s.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {s.dateHint && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          <Calendar className="h-3.5 w-3.5" /> {s.dateHint}
                        </span>
                      )}
                      {s.cta && (
                        <a href={s.cta.href} className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{s.cta.label}</a>
                      )}
                    </div>
                  </div>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
      {ctaLabel && ctaHref && (
        <div className="mt-6">
          <a href={ctaHref} className="inline-flex items-center justify-center rounded bg-brand-600 px-4 py-2 text-white shadow-subtle transition hover:translate-y-[-1px] hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400">{ctaLabel}</a>
        </div>
      )}
    </section>
  );
}
