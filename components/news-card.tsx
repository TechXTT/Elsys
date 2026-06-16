import Image from "next/image";
import NextLink from "next/link";
import type { ColorTag } from "@prisma/client";

import { Badge, colorTagToBadge } from "@/components/ui/Badge";
import { defaultLocale, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { isRemoteSrc } from "@/lib/image";
import { formatDateLabel } from "@/lib/format-date";
import { PostItem } from "@/lib/types";

interface NewsCardProps {
  post: PostItem;
  locale?: Locale;
  /** Larger lead treatment (bigger image + heading). Figma 26:2 "featured". */
  featured?: boolean;
  /** Optional category chip — mapped through the ColorTag→Badge adapter. */
  category?: ColorTag;
  categoryLabel?: string;
  className?: string;
}

/**
 * NewsCard (Figma 26:2) — image + category Badge + title + excerpt + date.
 * The whole card is a single link; the image is decorative (alt="") so the
 * link's accessible name is its visible text. Variants: with-image × featured.
 */
export function NewsCard({
  post,
  locale = defaultLocale,
  featured = false,
  category,
  categoryLabel,
  className,
}: NewsCardProps) {
  const displayDate = formatDateLabel(post.date, locale);
  const coverImage = post.image ?? post.images?.[0]?.url;

  // Build a locale-prefixed href that works in both App Router and Pages Router.
  const rawHref = post.href || "/";
  const hasLocalePrefix = /^\/(?:bg|en)(?:\/|$)/.test(rawHref);
  const href = hasLocalePrefix
    ? rawHref
    : `/${locale}/${rawHref.replace(/^\//, "")}`;

  return (
    <NextLink
      href={href as unknown as never}
      data-ui="news-card"
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] no-underline",
        "border border-line bg-surface transition-colors hover:border-line-strong",
        className,
      )}
    >
      {coverImage && (
        <div
          className={cn(
            "relative w-full overflow-hidden border-b border-line bg-subtle",
            featured ? "aspect-[16/9]" : "aspect-[4/3]",
          )}
        >
          <Image
            fill
            src={coverImage}
            alt=""
            sizes={featured ? "(min-width: 768px) 720px, 100vw" : "(min-width: 768px) 360px, 100vw"}
            className="object-cover"
            unoptimized={isRemoteSrc(coverImage)}
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-[var(--spacing-xs)] p-[var(--spacing-lg)]">
        {category && categoryLabel && (
          <span>
            <Badge color={colorTagToBadge(category)} size="sm">
              {categoryLabel}
            </Badge>
          </span>
        )}
        <h3 className={cn("text-ink-heading", featured ? "text-h3" : "text-h4")}>{post.title}</h3>
        {post.excerpt && (
          <p className={cn("text-ink-muted", featured ? "text-body-lg" : "text-body")}>{post.excerpt}</p>
        )}
        {displayDate && <p className="text-caption mt-auto pt-[var(--spacing-2xs)] text-ink-muted">{displayDate}</p>}
      </div>
    </NextLink>
  );
}
