import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  totalPages: number;
  /** Build the href for a given page number. */
  hrefFor: (page: number) => string;
  /** Accessible nav label + prev/next labels (Bulgarian, from the consumer). */
  label: string;
  previousLabel: string;
  nextLabel: string;
  className?: string;
}

const cellBase = cn(
  "inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--radius-md)]",
  "px-[var(--spacing-xs)] text-body-sm",
);
const inactiveCell = cn(
  "border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]",
  "text-[var(--color-text-body)] hover:bg-[var(--color-bg-subtle)]",
);
const disabledCell = "border border-[var(--color-border-default)] text-[var(--color-action-disabled-text)] pointer-events-none";

function pageList(page: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "ellipsis")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push("ellipsis");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}

/** Pagination (Figma 19:8). Current cell is brand/600 + white (now AA). */
export function Pagination({
  page,
  totalPages,
  hrefFor,
  label,
  previousLabel,
  nextLabel,
  className,
}: PaginationProps) {
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex items-center gap-[var(--spacing-xs)]">
        <li>
          {atStart ? (
            <span aria-disabled className={cn(cellBase, disabledCell)} aria-label={previousLabel}>
              <ChevronLeft aria-hidden size={18} />
            </span>
          ) : (
            <a data-ui="pagination" href={hrefFor(page - 1)} aria-label={previousLabel} className={cn(cellBase, inactiveCell)}>
              <ChevronLeft aria-hidden size={18} />
            </a>
          )}
        </li>

        {pageList(page, totalPages).map((item, i) =>
          item === "ellipsis" ? (
            <li key={`e${i}`} aria-hidden className="px-[var(--spacing-2xs)] text-body-sm text-[var(--color-text-muted)]">
              …
            </li>
          ) : item === page ? (
            <li key={item}>
              <span
                aria-current="page"
                className={cn(cellBase, "bg-[var(--color-action-primary)] text-[var(--color-text-on-brand)]")}
              >
                {item}
              </span>
            </li>
          ) : (
            <li key={item}>
              <a data-ui="pagination" href={hrefFor(item)} className={cn(cellBase, inactiveCell)}>
                {item}
              </a>
            </li>
          ),
        )}

        <li>
          {atEnd ? (
            <span aria-disabled className={cn(cellBase, disabledCell)} aria-label={nextLabel}>
              <ChevronRight aria-hidden size={18} />
            </span>
          ) : (
            <a data-ui="pagination" href={hrefFor(page + 1)} aria-label={nextLabel} className={cn(cellBase, inactiveCell)}>
              <ChevronRight aria-hidden size={18} />
            </a>
          )}
        </li>
      </ul>
    </nav>
  );
}
