"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { COLOR_TAG_OPTIONS } from "@/lib/content/shared";

// ColorTag picker (Figma 94:2) — swatch circles, one selected. Submits the enum
// value via a hidden input. Swatch hues map the 10-value Prisma enum onto the 6
// design-system tag tokens (RED/PINK→coral, INDIGO→purple, GRAY→slate); the
// title/aria-label disambiguates duplicated hues. Fully token-bound (no hex).
const SWATCH: Record<string, string> = {
  RED: "bg-[var(--color-tag-coral)]",
  ORANGE: "bg-[var(--color-tag-amber)]",
  YELLOW: "bg-[var(--color-tag-amber)]",
  GREEN: "bg-[var(--color-tag-green)]",
  TEAL: "bg-[var(--color-tag-teal)]",
  BLUE: "bg-[var(--color-tag-blue)]",
  INDIGO: "bg-[var(--color-tag-purple)]",
  PURPLE: "bg-[var(--color-tag-purple)]",
  PINK: "bg-[var(--color-tag-coral)]",
  GRAY: "bg-[var(--color-text-muted)]",
};

export function ColorTagPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ColorTag">
      <input type="hidden" name={name} value={value} />
      {COLOR_TAG_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setValue(opt.value)}
            className={`flex h-8 w-8 items-center justify-center rounded-full ${SWATCH[opt.value] ?? "bg-[var(--color-tag-blue)]"} ${
              selected ? "ring-2 ring-[var(--color-action-primary)] ring-offset-2 ring-offset-[var(--color-bg-surface)]" : ""
            }`}
          >
            {selected && <Check className="h-4 w-4 text-white" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
