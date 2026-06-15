"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/cn";

type AccentPriority = "info" | "urgent";

interface HeaderAccentProps {
  /** Stable id — used as the dismissal persistence key. */
  id: string;
  message: string;
  priority?: AccentPriority;
  dismissible?: boolean;
  className?: string;
}

const storageKeyFor = (id: string) => `elsys-accent-dismissed:${id}`;

// info  → brand tint + body text, polite (role=status)
// urgent → amber status surface + warning text, assertive (role=alert)
const tone: Record<AccentPriority, { wrap: string; icon: string; Icon: typeof Info; role: "status" | "alert" }> = {
  info: {
    wrap: "bg-brand-tint text-ink",
    icon: "bg-tag-blue text-ink-on-brand",
    Icon: Info,
    role: "status",
  },
  urgent: {
    wrap: "bg-status-warning-bg text-status-warning-text",
    icon: "bg-tag-amber text-ink-on-brand",
    Icon: TriangleAlert,
    role: "alert",
  },
};

/**
 * HeaderAccent (Figma 28:26) — a dismissible announcement bar. Colour AND an
 * icon convey priority (never colour alone); dismissal persists per `id`.
 */
export function HeaderAccent({ id, message, priority = "info", dismissible = true, className }: HeaderAccentProps) {
  const t = useTranslations("HeaderAccent");
  const [dismissed, setDismissed] = useState(false);
  const { wrap, icon, Icon, role } = tone[priority];

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKeyFor(id)) === "1") setDismissed(true);
    } catch {
      /* storage unavailable — keep the banner visible */
    }
  }, [id]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKeyFor(id), "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role={role}
      data-priority={priority}
      className={cn(
        "flex items-center gap-[var(--spacing-sm)] rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)]",
        wrap,
        className,
      )}
    >
      <span aria-hidden className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-full)]", icon)}>
        <Icon size={14} />
      </span>
      <p className="text-body-sm flex-1">{message}</p>
      {dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          data-ui="header-accent-dismiss"
          className="-my-[var(--spacing-xs)] flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)]"
        >
          <X size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}
