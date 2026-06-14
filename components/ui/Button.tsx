import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Every colour / space / radius binds to a Phase-A var(--…); no literals.
// Focus ring is owned by the shared `[data-ui]:focus-visible` rule in
// globals.css (2px --color-action-focus-ring, offset 2px) — primitives set
// data-ui so the legacy global button:focus-visible rule skips them.
const base = cn(
  "inline-flex items-center justify-center gap-[var(--spacing-xs)]",
  "rounded-[var(--radius-md)] whitespace-nowrap select-none cursor-pointer",
  "transition-colors disabled:cursor-not-allowed",
);

const sizes: Record<ButtonSize, string> = {
  sm: "text-body-sm px-[var(--spacing-sm)] py-[var(--spacing-xs)]",
  md: "text-body px-[var(--spacing-md)] py-[var(--spacing-sm)]",
  lg: "text-body-lg px-[var(--spacing-lg)] py-[var(--spacing-md)]",
};

// Disabled is colour-conveyed (opacity stays 1) per WCAG; secondary/ghost
// label text uses --color-text-link (brand/600, 6.1:1) rather than Figma's
// brand/500 (4.32:1, fails AA for small text). Secondary border keeps
// brand/500 — borders only need 3:1 (WCAG 1.4.11).
const variants: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[var(--color-action-primary)] text-[var(--color-text-on-brand)]",
    "hover:bg-[var(--color-action-primary-hover)]",
    "disabled:bg-[var(--color-action-disabled-bg)] disabled:text-[var(--color-action-disabled-text)]",
    "disabled:hover:bg-[var(--color-action-disabled-bg)]",
  ),
  secondary: cn(
    "border border-[var(--color-action-secondary-border)] bg-transparent text-[var(--color-text-link)]",
    "hover:bg-[var(--color-bg-brand-tint)]",
    "disabled:border-[var(--color-action-disabled-bg)] disabled:text-[var(--color-action-disabled-text)]",
    "disabled:bg-transparent disabled:hover:bg-transparent",
  ),
  ghost: cn(
    "bg-transparent text-[var(--color-text-link)]",
    "hover:bg-[var(--color-bg-brand-tint)]",
    "disabled:text-[var(--color-action-disabled-text)] disabled:bg-transparent disabled:hover:bg-transparent",
  ),
};

/**
 * Button — the design-system primitive (Figma 15:56).
 * Label is supplied by the consumer via `children`, so the component carries
 * no literal copy (i18n is the caller's responsibility). Hover/disabled are
 * native states; `variant` × `size` are the only props beyond button attrs.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-ui="button"
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
});
