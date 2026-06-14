import { Search } from "lucide-react";

import { cn } from "@/lib/cn";

export interface SearchBarProps {
  /** Accessible label (Bulgarian, supplied by the consumer). Visually hidden. */
  label: string;
  placeholder?: string;
  name?: string;
  defaultValue?: string;
  action?: string;
  method?: "get" | "post";
  variant?: "expanded" | "collapsed";
  className?: string;
}

/**
 * SearchBar (Figma 18:7) — full-radius pill, surface bg, leading magnifier.
 * `expanded` (default) is the full input; `collapsed` is the icon-only toggle
 * for compact chrome (the header wires its expand behaviour in Phase C).
 */
export function SearchBar({
  label,
  placeholder,
  name = "q",
  defaultValue,
  action,
  method = "get",
  variant = "expanded",
  className,
}: SearchBarProps) {
  if (variant === "collapsed") {
    return (
      <form role="search" action={action} method={method} className={className}>
        <button
          type="submit"
          data-ui="searchbar-toggle"
          aria-label={label}
          className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-full)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]"
        >
          <Search aria-hidden size={18} />
        </button>
      </form>
    );
  }

  return (
    <form role="search" action={action} method={method} className={cn("relative w-full", className)}>
      <Search
        aria-hidden
        size={18}
        className="pointer-events-none absolute left-[var(--spacing-md)] top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      />
      <input
        data-ui="searchbar"
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          "h-11 w-full rounded-[var(--radius-full)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]",
          "pl-[var(--spacing-2xl)] pr-[var(--spacing-md)] text-body text-[var(--color-text-body)]",
          "placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-action-secondary-border)] focus:outline-none",
        )}
      />
    </form>
  );
}
