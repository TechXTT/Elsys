"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 space-y-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="text-body-sm flex items-center gap-1 text-[var(--color-text-muted)]">
          <Link href="/admin" className="hover:text-[var(--color-text-link)]">
            Dashboard
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4" />
              {crumb.href ? (
                <Link href={crumb.href as any} className="hover:text-[var(--color-text-link)]">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--color-text-body)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h2 text-[var(--color-text-heading)]">{title}</h1>
          {description && (
            <p className="mt-1 text-[var(--color-text-muted)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
