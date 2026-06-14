import type { HTMLAttributes } from "react";
import type { ColorTag } from "@prisma/client";

import { cn } from "@/lib/cn";

// The 6 AA-verified design-token colours (design/tokens.json). NOTE: this is
// NOT the same set as Prisma's 10-value ColorTag enum — use colorTagToBadge()
// to adapt. See the Phase-B report flag re: reconciling the two.
export type BadgeColor = "blue" | "green" | "coral" | "purple" | "teal" | "amber";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  size?: BadgeSize;
}

// Accessible badge: tag-tint background + tag-ink text + a solid tag dot.
// White-on-solid-tag fails AA for small text (design-system §3); every
// tint+ink pair passes AA in both light and dark.
const colour: Record<BadgeColor, string> = {
  blue: "bg-[var(--color-tag-tint-blue)] text-[var(--color-tag-ink-blue)]",
  green: "bg-[var(--color-tag-tint-green)] text-[var(--color-tag-ink-green)]",
  coral: "bg-[var(--color-tag-tint-coral)] text-[var(--color-tag-ink-coral)]",
  purple: "bg-[var(--color-tag-tint-purple)] text-[var(--color-tag-ink-purple)]",
  teal: "bg-[var(--color-tag-tint-teal)] text-[var(--color-tag-ink-teal)]",
  amber: "bg-[var(--color-tag-tint-amber)] text-[var(--color-tag-ink-amber)]",
};
const dotColour: Record<BadgeColor, string> = {
  blue: "bg-[var(--color-tag-blue)]",
  green: "bg-[var(--color-tag-green)]",
  coral: "bg-[var(--color-tag-coral)]",
  purple: "bg-[var(--color-tag-purple)]",
  teal: "bg-[var(--color-tag-teal)]",
  amber: "bg-[var(--color-tag-amber)]",
};
const sizing: Record<BadgeSize, string> = {
  sm: "gap-[var(--spacing-2xs)] px-[var(--spacing-xs)] py-[var(--spacing-2xs)]",
  md: "gap-[var(--spacing-xs)] px-[var(--spacing-sm)] py-[var(--spacing-xs)]",
};
const dotSize: Record<BadgeSize, string> = { sm: "h-1.5 w-1.5", md: "h-2 w-2" };

/** Badge / CategoryLabel (Figma 35:38). Label supplied via children. */
export function Badge({ color = "blue", size = "md", className, children, ...props }: BadgeProps) {
  return (
    <span
      data-ui="badge"
      className={cn(
        "text-overline inline-flex items-center rounded-[var(--radius-full)] whitespace-nowrap",
        colour[color],
        sizing[size],
        className,
      )}
      {...props}
    >
      <span aria-hidden className={cn("shrink-0 rounded-[var(--radius-full)]", dotColour[color], dotSize[size])} />
      {children}
    </span>
  );
}

// Adapter: Prisma ColorTag (10 values) → the 6 token Badge colours. The schema
// enum predates the design system; mapping is lossy (ORANGE/YELLOW→amber,
// RED/PINK→coral, INDIGO→purple, GRAY→blue fallback). Flagged for reconciliation.
const tagMap: Record<ColorTag, BadgeColor> = {
  RED: "coral",
  ORANGE: "amber",
  YELLOW: "amber",
  GREEN: "green",
  TEAL: "teal",
  BLUE: "blue",
  INDIGO: "purple",
  PURPLE: "purple",
  PINK: "coral",
  GRAY: "blue",
};
export function colorTagToBadge(tag: ColorTag): BadgeColor {
  return tagMap[tag] ?? "blue";
}
