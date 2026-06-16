import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

import { Link } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// Every colour / space / radius binds to a Phase-A var(--…); no literals.
// Focus ring is owned by the shared `[data-ui]:focus-visible` rule in
// globals.css (2px --color-action-focus-ring, offset 2px) — these set data-ui
// so the legacy global button:focus-visible rule skips them.
const base = cn(
  "inline-flex items-center justify-center gap-[var(--spacing-xs)]",
  "rounded-[var(--radius-md)] whitespace-nowrap select-none cursor-pointer",
  "transition-colors disabled:cursor-not-allowed no-underline",
);

const sizes: Record<ButtonSize, string> = {
  sm: "text-body-sm px-[var(--spacing-sm)] py-[var(--spacing-xs)]",
  md: "text-body px-[var(--spacing-md)] py-[var(--spacing-sm)]",
  lg: "text-body-lg px-[var(--spacing-lg)] py-[var(--spacing-md)]",
};

// Disabled is colour-conveyed (opacity stays 1) per WCAG; secondary/ghost
// label text uses --color-text-link (brand/600, 6.1:1) rather than Figma's
// brand/500 (4.32:1, fails AA for small text). Secondary border keeps brand/500.
const variants: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[var(--color-action-primary)] text-[var(--color-text-on-action)]",
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

// Static disabled look for link-buttons (the `disabled:` variants only fire on
// real form controls, not <a>/<span>).
const disabledLook: Record<ButtonVariant, string> = {
  primary: "bg-[var(--color-action-disabled-bg)] text-[var(--color-action-disabled-text)]",
  secondary: "border border-[var(--color-action-disabled-bg)] bg-transparent text-[var(--color-action-disabled-text)]",
  ghost: "bg-transparent text-[var(--color-action-disabled-text)]",
};

export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  const { variant = "primary", size = "md", className } = opts;
  return cn(base, sizes[size], variants[variant], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Button — design-system primitive (Figma 15:56). Label via children. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", type = "button", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-ui="button"
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
});

export interface ButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href: string;
  /** Render a plain external <a> (new tab) instead of the locale-aware Link. */
  external?: boolean;
  disabled?: boolean;
}

/**
 * ButtonLink — the Button styling rendered as a link. Internal hrefs go through
 * the locale-aware next-intl Link; `external` renders a new-tab <a>. Disabled
 * links become an inert role="link" span (aria-disabled, colour-conveyed).
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  href,
  external,
  disabled,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  if (disabled) {
    return (
      <span
        data-ui="button"
        role="link"
        aria-disabled="true"
        className={cn(base, sizes[size], disabledLook[variant], "pointer-events-none", className)}
      >
        {children}
      </span>
    );
  }
  const classes = buttonClasses({ variant, size, className });
  if (external) {
    return (
      <a data-ui="button" href={href} target="_blank" rel="noreferrer noopener" className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link data-ui="button" href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
