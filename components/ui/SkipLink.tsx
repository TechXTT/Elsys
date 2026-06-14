import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface SkipLinkProps {
  /** Target id of the main landmark. */
  href?: string;
  children: ReactNode;
  className?: string;
}

/**
 * SkipLink (Figma 19:19). Visually hidden until focused, then a surface chip
 * with the shared [data-ui] focus ring. Render as the first focusable element
 * in the layout, before the header.
 */
export function SkipLink({ href = "#main", children, className }: SkipLinkProps) {
  return (
    <a
      data-ui="skiplink"
      href={href}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:fixed focus:left-[var(--spacing-md)] focus:top-[var(--spacing-md)] focus:z-50",
        "focus:inline-flex focus:items-center focus:rounded-[var(--radius-md)]",
        "focus:border focus:border-[var(--color-border-default)] focus:bg-[var(--color-bg-surface)]",
        "focus:px-[var(--spacing-md)] focus:py-[var(--spacing-xs)]",
        "text-body text-[var(--color-text-link)]",
        className,
      )}
    >
      {children}
    </a>
  );
}
