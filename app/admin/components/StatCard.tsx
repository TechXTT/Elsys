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
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/50",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/50",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/50",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-100 dark:border-purple-900/50",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/50",
    icon: "text-orange-600 dark:text-orange-400",
    border: "border-orange-100 dark:border-orange-900/50",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/50",
    icon: "text-red-600 dark:text-red-400",
    border: "border-red-100 dark:border-red-900/50",
  },
  slate: {
    bg: "bg-slate-50 dark:bg-slate-900/50",
    icon: "text-slate-600 dark:text-slate-400",
    border: "border-slate-100 dark:border-slate-800",
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`relative overflow-hidden rounded-xl border ${colors.border} ${colors.bg} p-6 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              <span className={trend.value >= 0 ? "text-emerald-600" : "text-red-600"}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`rounded-lg p-3 ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
