"use client";

import { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "purple";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

// Token-bound (tint bg + ink text), AA-safe in both modes (mirrors the public Badge).
const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-bg-subtle)] text-[var(--color-text-body)]",
  success: "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]",
  warning: "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]",
  danger: "bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)]",
  info: "bg-[var(--color-tag-tint-blue)] text-[var(--color-tag-ink-blue)]",
  purple: "bg-[var(--color-tag-tint-purple)] text-[var(--color-tag-ink-purple)]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-text-muted)]",
  success: "bg-[var(--color-tag-green)]",
  warning: "bg-[var(--color-tag-amber)]",
  danger: "bg-[var(--color-tag-coral)]",
  info: "bg-[var(--color-tag-blue)]",
  purple: "bg-[var(--color-tag-purple)]",
};

const sizeClasses = {
  sm: "px-[var(--spacing-xs)] py-0.5 text-caption",
  md: "px-[var(--spacing-sm)] py-1 text-body-sm",
};

export function Badge({ children, variant = "default", size = "sm", dot }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-full)] font-medium ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

// Preset badges for common use cases
export function PublishedBadge() {
  return <Badge variant="success">Published</Badge>;
}

export function DraftBadge() {
  return <Badge variant="warning">Draft</Badge>;
}

export function AdminBadge() {
  return <Badge variant="purple">Admin</Badge>;
}

export function UserBadge() {
  return <Badge variant="default">User</Badge>;
}

export function LocaleBadge({ locale }: { locale: string }) {
  return (
    <Badge variant="info" size="sm">
      {locale.toUpperCase()}
    </Badge>
  );
}
