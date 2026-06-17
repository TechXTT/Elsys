import Image from "next/image";
import type { ReactNode } from "react";
import type { ColorTag } from "@prisma/client";

import { type BadgeColor, colorTagToBadge } from "@/components/ui/Badge";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

interface ClubCardProps {
  name: string;
  description?: string;
  /** Drives the solid header band colour via the ColorTag→tag-solid mapping. */
  color?: ColorTag;
  /** Logo image URL; falls back to a plain white disc when omitted. */
  logo?: string;
  href?: string;
  locale?: Locale;
  className?: string;
}

// Solid tag band (Figma 26:18 header). These are decorative bands behind a
// white logo disc — they carry no text, so the white-on-solid AA limit (which
// is why Badge uses tint+ink) does not apply here.
const bandColour: Record<BadgeColor, string> = {
  blue: "bg-tag-blue",
  green: "bg-tag-green",
  coral: "bg-tag-coral",
  purple: "bg-tag-purple",
  teal: "bg-tag-teal",
  amber: "bg-tag-amber",
};

/**
 * ClubCard (Figma 26:18) — ColorTag solid header band + logo disc, with title
 * and description on a surface body. Whole card is a link when `href` is given.
 */
export function ClubCard({ name, description, color = "BLUE", logo, href, locale, className }: ClubCardProps) {
  const band = bandColour[colorTagToBadge(color)];

  const inner: ReactNode = (
    <>
      <div className={cn("flex h-20 items-center justify-center", band)}>
        <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[var(--radius-full)] bg-surface">
          {logo && <Image fill src={logo} alt="" sizes="56px" className="object-contain p-[var(--spacing-2xs)]" />}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-[var(--spacing-2xs)] p-[var(--spacing-lg)]">
        <h3 className="text-h4 text-ink-heading">{name}</h3>
        {description && <p className="text-body text-ink-muted">{description}</p>}
      </div>
    </>
  );

  const shell = cn(
    "flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)]",
    "border border-line bg-surface",
    href && "no-underline transition-colors hover:border-line-strong",
    className,
  );

  if (href) {
    return (
      <Link href={href} locale={locale} data-ui="club-card" className={shell}>
        {inner}
      </Link>
    );
  }
  return <div className={shell}>{inner}</div>;
}
