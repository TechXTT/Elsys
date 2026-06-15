import { cn } from "@/lib/cn";

interface NumberStatProps {
  value: string;
  label: string;
  /** Accent colour for the value. coral = text/accent (coral/600, AA). */
  accent?: "brand" | "coral";
  className?: string;
}

// Display-size value, so even the coral accent (coral/600, 6.16:1 on white)
// clears AA comfortably as large text.
const accentColour = {
  brand: "text-ink-link",
  coral: "text-ink-accent",
} as const;

/**
 * NumberStat (Figma 28:5) — a large display value over an overline label, on a
 * subtle card. Accent: brand·coral.
 */
export function NumberStat({ value, label, accent = "brand", className }: NumberStatProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-[var(--spacing-2xs)] rounded-[var(--radius-lg)] bg-subtle p-[var(--spacing-lg)] text-center",
        className,
      )}
    >
      <span className={cn("text-display", accentColour[accent])}>{value}</span>
      <span className="text-overline text-ink-muted">{label}</span>
    </div>
  );
}
