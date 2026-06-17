"use client";

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";

import { Link } from "@/i18n/routing";
import type { UiNavNode } from "@/lib/navigation-build";
import { cn } from "@/lib/cn";

type Tone = "brand" | "surface";

/**
 * NavDropdown (Figma 23:25) — two-column mega-menu. Opens on hover and on
 * focus of the trigger; Esc closes and restores focus; Tab moves through the
 * links; closed panel is `hidden` so its links aren't tab stops.
 */
export function NavDropdown({
  item,
  tone,
  isActive,
}: {
  item: UiNavNode;
  tone: Tone;
  isActive: (href?: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const closeTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const clearTimer = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => {
    clearTimer();
    setOpen(true);
  };
  const closeSoon = () => {
    clearTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };
  const onBlur = (e: FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  const children = item.children ?? [];
  const triggerColor =
    tone === "brand" ? "text-[var(--color-text-on-brand)]" : "text-[var(--color-text-body)]";

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        data-ui="nav"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        onFocus={openNow}
        className={cn(
          "inline-flex items-center gap-[var(--spacing-2xs)] whitespace-nowrap rounded-[var(--radius-sm)] py-[var(--spacing-xs)] text-body font-medium hover:underline",
          triggerColor,
        )}
      >
        {item.label}
        <ChevronDown size={16} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={item.label}
        hidden={!open}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
        className={cn(
          "absolute left-0 top-full z-40 mt-[var(--spacing-xs)] min-w-[24rem] rounded-[var(--radius-md)]",
          "border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[var(--spacing-lg)]",
        )}
      >
        <p className="text-overline mb-[var(--spacing-sm)] text-[var(--color-text-muted)]">{item.label}</p>
        <ul className="grid grid-cols-2 gap-x-[var(--spacing-xl)] gap-y-[var(--spacing-xs)]">
          {children.map((child, idx) => (
            <li key={idx}>
              {child.external ? (
                <a
                  data-ui="nav"
                  href={child.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-body text-[var(--color-text-link)] hover:underline"
                >
                  {child.label}
                </a>
              ) : (
                <Link
                  data-ui="nav"
                  href={child.href ?? "#"}
                  aria-current={isActive(child.href) ? "page" : undefined}
                  className={cn(
                    "text-body text-[var(--color-text-link)] hover:underline",
                    isActive(child.href) && "font-semibold",
                  )}
                >
                  {child.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
