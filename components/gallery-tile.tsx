import Image from "next/image";
import type { ReactNode } from "react";

import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

type GalleryTileSize = "sm" | "lg";

interface GalleryTileProps {
  image: string;
  /** Alt text for the image. Pass "" only for purely decorative tiles. */
  alt: string;
  caption?: string;
  size?: GalleryTileSize;
  href?: string;
  locale?: Locale;
  className?: string;
}

const aspect: Record<GalleryTileSize, string> = {
  sm: "aspect-[4/3]",
  lg: "aspect-[3/2]",
};

/**
 * GalleryTile (Figma 27:2) — image with an optional caption overlay (footer
 * colour at ~90% + on-brand text). Whole tile is a link when `href` is given.
 */
export function GalleryTile({ image, alt, caption, size = "sm", href, locale, className }: GalleryTileProps) {
  const inner: ReactNode = (
    <>
      <Image fill src={image} alt={alt} sizes="(min-width: 768px) 360px, 100vw" className="object-cover" />
      {caption && (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 px-[var(--spacing-md)] py-[var(--spacing-sm)]",
            "text-body-sm text-ink-on-brand",
            "bg-[color-mix(in_srgb,var(--color-bg-footer)_90%,transparent)]",
          )}
        >
          {caption}
        </span>
      )}
    </>
  );

  const shell = cn(
    "relative block overflow-hidden rounded-[var(--radius-lg)] bg-subtle",
    aspect[size],
    href && "no-underline",
    className,
  );

  if (href) {
    return (
      <Link href={href} locale={locale} data-ui="gallery-tile" className={shell}>
        {inner}
      </Link>
    );
  }
  return <div className={shell}>{inner}</div>;
}
