import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";

interface AwardItemProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * AwardItem (Figma 112:12) — title + subtitle on the left, an amber trophy icon
 * on the right. Used in the per-year groups on /nagradi.
 */
export function AwardItem({ title, description, className }: AwardItemProps) {
  return (
    <article
      className={cn(
        "flex items-center justify-between gap-[var(--spacing-md)] rounded-[var(--radius-lg)] border border-line bg-surface p-[var(--spacing-lg)]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-[var(--spacing-2xs)]">
        <h3 className="text-h4 text-ink-heading">{title}</h3>
        {description && <p className="text-body-sm text-ink-muted">{description}</p>}
      </div>
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center text-tag-amber">
        <Trophy className="h-7 w-7" />
      </span>
    </article>
  );
}
