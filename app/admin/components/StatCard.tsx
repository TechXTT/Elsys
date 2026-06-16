"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: "blue" | "green" | "purple" | "orange" | "red" | "slate";
}

const colorClasses = {
  blue: { bg: "bg-[var(--color-bg-subtle)]", icon: "text-[var(--color-text-link)]", border: "border-[var(--color-border-default)]" },
  green: { bg: "bg-[var(--color-bg-subtle)]", icon: "text-[var(--color-status-success-text)]", border: "border-[var(--color-border-default)]" },
  purple: { bg: "bg-[var(--color-bg-subtle)]", icon: "text-[var(--color-tag-ink-purple)]", border: "border-[var(--color-border-default)]" },
  orange: { bg: "bg-[var(--color-bg-subtle)]", icon: "text-[var(--color-text-accent)]", border: "border-[var(--color-border-default)]" },
  red: { bg: "bg-[var(--color-bg-subtle)]", icon: "text-[var(--color-status-danger-text)]", border: "border-[var(--color-border-default)]" },
  slate: { bg: "bg-[var(--color-bg-subtle)]", icon: "text-[var(--color-text-muted)]", border: "border-[var(--color-border-default)]" },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-lg)] border ${colors.border} ${colors.bg} p-[var(--spacing-lg)] transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-body-sm font-medium text-[var(--color-text-muted)]">{title}</p>
          <p className="text-h2 text-[var(--color-text-heading)]">{value}</p>
          {subtitle && (
            <p className="text-body-sm text-[var(--color-text-muted)]">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-body-sm">
              <span className={trend.value >= 0 ? "text-[var(--color-status-success-text)]" : "text-[var(--color-status-danger-text)]"}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-[var(--color-text-muted)]">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`rounded-[var(--radius-md)] p-3 ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
