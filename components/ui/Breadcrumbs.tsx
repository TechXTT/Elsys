import { Fragment, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface Crumb {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  /** Accessible nav label (Bulgarian, from the consumer). */
  label: string;
  separator?: ReactNode;
  className?: string;
}

/**
 * Breadcrumbs (Figma 19:2). Body/Small. Links use --color-text-link, separators
 * --color-text-muted, the current (last) crumb --color-text-body + aria-current.
 */
export function Breadcrumbs({ items, label, separator = "/", className }: BreadcrumbsProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-[var(--spacing-xs)] text-body-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li>
                {item.href && !isLast ? (
                  <a
                    data-ui="breadcrumb"
                    href={item.href}
                    className="rounded-[var(--radius-sm)] text-[var(--color-text-link)] hover:underline"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span
                    className="text-[var(--color-text-body)]"
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden className={cn("text-[var(--color-text-muted)]")}>
                  {separator}
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
