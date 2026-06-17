import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

interface DocumentRowProps {
  name: string;
  href: string;
  /** Filetype label, e.g. "PDF" — surfaced in the accessible name. */
  fileType?: string;
  /** Human-readable size, e.g. "1.4 MB" — surfaced in the accessible name. */
  size?: string;
  /** Filetype icon, supplied by the caller (INSTANCE_SWAP slot in Figma). */
  icon?: ReactNode;
  className?: string;
}

/**
 * DocumentRow (Figma 27:6) — filetype icon + name + size + a download link.
 * The link carries `download` and folds the filetype/size into its accessible
 * name so screen-reader users hear what they are fetching.
 */
export function DocumentRow({ name, href, fileType, size, icon, className }: DocumentRowProps) {
  const t = useTranslations("Document");
  const meta = [fileType, size].filter(Boolean).join(", ");
  const ariaLabel = t("downloadAria", { name, meta: meta ? ` (${meta})` : "" });

  return (
    <div
      className={cn(
        "flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-line bg-surface p-[var(--spacing-md)]",
        className,
      )}
    >
      {icon && (
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-2xs)]">
        <p className="text-body text-ink-heading">{name}</p>
        {size && <p className="text-caption text-ink-muted">{size}</p>}
      </div>
      <a
        href={href}
        download
        aria-label={ariaLabel}
        data-ui="document-row-download"
        className="text-body-sm shrink-0 text-ink-link no-underline hover:underline"
      >
        {t("download")}
      </a>
    </div>
  );
}
