"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface QuickActionProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color?: "blue" | "green" | "purple" | "orange";
}

const colorClasses = {
  blue: "hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700 dark:hover:bg-blue-950/30",
  green: "hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30",
  purple: "hover:border-purple-300 hover:bg-purple-50 dark:hover:border-purple-700 dark:hover:bg-purple-950/30",
  orange: "hover:border-orange-300 hover:bg-orange-50 dark:hover:border-orange-700 dark:hover:bg-orange-950/30",
};

const iconColors = {
  blue: "text-blue-600 dark:text-blue-400 group-hover:text-blue-700",
  green: "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700",
  purple: "text-purple-600 dark:text-purple-400 group-hover:text-purple-700",
  orange: "text-orange-600 dark:text-orange-400 group-hover:text-orange-700",
};

export function QuickAction({ href, icon: Icon, title, description, color = "blue" }: QuickActionProps) {
  return (
    <Link
      href={href as any}
      className={`group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all dark:border-slate-800 dark:bg-slate-900 ${colorClasses[color]}`}
    >
      <div className={`rounded-lg p-2 ${iconColors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-200">
          {title}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="text-slate-400 transition-transform group-hover:translate-x-1">→</div>
    </Link>
  );
}
