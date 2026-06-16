import React from 'react';

import { cn } from "@/lib/cn";

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

type HeadingLevel = "h1" | "h2" | "h3";

interface SectionHeadingProps {
  /** Regular-weight lead text. */
  title: string;
  /** Bold-weight emphasised segment, rendered after the title (legacy two-tone). */
  highlight?: string;
  description?: string;
  /** Heading element to render (default h2). */
  as?: HeadingLevel;
  align?: "start" | "center";
  className?: string;
}

/**
 * SectionHeading (Figma 28:2) — the legacy two-tone heading: a regular-weight
 * lead followed by a bold emphasised segment, both in the heading colour, with
 * an optional muted description. The split is prop-driven, never hardcoded.
 */
export function SectionHeading({
  title,
  highlight,
  description,
  as = "h2",
  align = "start",
  className,
}: SectionHeadingProps) {
  const Tag = as;
  const sizeClass = as === "h1" ? "text-h1" : as === "h3" ? "text-h3" : "text-h2";
  return (
    <div className={cn("flex flex-col gap-[var(--spacing-xs)]", align === "center" && "items-center text-center", className)}>
      <Tag className={cn(sizeClass, "font-normal text-ink-heading")}>
        {title}
        {highlight && <> <span className="font-bold">{highlight}</span></>}
      </Tag>
      {description && <p className="text-body-lg max-w-2xl text-ink-muted">{description}</p>}
    </div>
  );
}
