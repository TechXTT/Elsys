import Image from "next/image";

import { Link } from "@/i18n/routing";
import { defaultLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { formatDateLabel } from "@/lib/format-date";
import { PostItem } from "@/lib/types";

type PostCardVariant = "compact" | "full";

interface PostCardProps {
  post: PostItem;
  locale?: Locale;
  /** compact (default) = small square thumb; full = larger thumb + heading. */
  variant?: PostCardVariant;
  /** Eyebrow label above the title (e.g. "БЛОГ"), rendered in the accent colour. */
  eyebrow?: string;
  className?: string;
}

const thumbSize: Record<PostCardVariant, string> = {
  compact: "w-[72px]",
  full: "w-[112px]",
};

/**
 * PostCard (Figma 26:11) — compact horizontal strip: thumb + eyebrow + title +
 * date. The whole row is a single link (locale-aware). Variants: compact·full.
 */
export function PostCard({
  post,
  locale = defaultLocale,
  variant = "compact",
  eyebrow,
  className,
}: PostCardProps) {
  const displayDate = formatDateLabel(post.date, locale);
  const thumb = post.image ?? post.images?.[0]?.url;

  return (
    <Link
      href={post.href}
      locale={locale}
      data-ui="post-card"
      className={cn(
        "flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-lg)] no-underline",
        "border border-line bg-surface p-[var(--spacing-md)] transition-colors hover:border-line-strong",
        className,
      )}
    >
      {thumb && (
        <div
          className={cn("relative aspect-square shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-subtle", thumbSize[variant])}
        >
          <Image fill src={thumb} alt="" sizes="112px" className="object-cover" />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-[var(--spacing-2xs)]">
        {eyebrow && <span className="text-overline text-ink-accent">{eyebrow}</span>}
        <h3 className={cn("text-ink-heading", variant === "full" ? "text-h4" : "text-body-lg font-semibold")}>
          {post.title}
        </h3>
        {displayDate && <p className="text-caption text-ink-muted">{displayDate}</p>}
      </div>
    </Link>
  );
}
