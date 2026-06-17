"use client";

import { ReactNode, ButtonHTMLAttributes, forwardRef } from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  loading?: boolean;
  children: ReactNode;
}

interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  children: ReactNode;
  className?: string;
  external?: boolean;
}

// Token-bound (design system). Focus ring via the shared [data-ui]:focus-visible
// rule. Danger keeps a coral surface for destructive intent.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-action-primary)] text-[var(--color-text-on-action)] hover:bg-[var(--color-action-primary-hover)]",
  secondary:
    "border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-subtle)]",
  danger:
    "bg-[var(--color-status-danger-text)] text-[var(--color-text-on-brand)] hover:opacity-90",
  ghost:
    "text-[var(--color-text-body)] hover:bg-[var(--color-bg-subtle)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-[var(--spacing-sm)] py-[var(--spacing-2xs)] text-body-sm gap-1.5 min-h-9",
  md: "px-[var(--spacing-md)] py-[var(--spacing-xs)] text-body-sm gap-2 min-h-11",
  lg: "px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-body gap-2 min-h-11",
};

const iconSizes: Record<ButtonSize, string> = {
  sm: "h-4 w-4",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon: Icon,
      iconPosition = "left",
      loading,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        data-ui="admin-button"
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className={`animate-spin ${iconSizes[size]} ${iconPosition === "right" ? "order-2" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                className="opacity-75"
              />
            </svg>
            {children}
          </>
        ) : (
          <>
            {Icon && iconPosition === "left" && <Icon className={iconSizes[size]} />}
            {children}
            {Icon && iconPosition === "right" && <Icon className={iconSizes[size]} />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  children,
  className = "",
  external,
}: LinkButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" data-ui="admin-button" className={classes}>
        {Icon && iconPosition === "left" && <Icon className={iconSizes[size]} />}
        {children}
        {Icon && iconPosition === "right" && <Icon className={iconSizes[size]} />}
      </a>
    );
  }

  return (
    <Link href={href as any} data-ui="admin-button" className={classes}>
      {Icon && iconPosition === "left" && <Icon className={iconSizes[size]} />}
      {children}
      {Icon && iconPosition === "right" && <Icon className={iconSizes[size]} />}
    </Link>
  );
}
