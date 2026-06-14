import type { Metadata } from "next";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

// Design-system catalog — a successor-facing reference (generational-turnover
// constraint), not production UI. noindex + absent from sitemap.ts (allowlist).
// Sample labels here are intentionally literal: this is a dev tool, not
// user-facing copy that needs next-intl.
export const metadata: Metadata = {
  title: "UI Preview · Button",
  robots: { index: false, follow: false },
};

const SAMPLE = "Бутон";
const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost"];
const SIZES: ButtonSize[] = ["sm", "md", "lg"];

// Force the :hover appearance statically so the catalog mirrors Figma's
// Default/Hover/Disabled columns (real hover still applies interactively).
const HOVER: Record<ButtonVariant, string> = {
  primary: "!bg-[var(--color-action-primary-hover)]",
  secondary: "!bg-[var(--color-bg-brand-tint)]",
  ghost: "!bg-[var(--color-bg-brand-tint)]",
};

function Matrix() {
  return (
    <div className="flex flex-col gap-[var(--spacing-2xl)]">
      {VARIANTS.map((variant) => (
        <section key={variant} className="flex flex-col gap-[var(--spacing-md)]">
          <h2 className="text-h4 capitalize text-ink-heading">{variant}</h2>
          <div className="grid grid-cols-[7rem_repeat(3,minmax(0,1fr))] items-center gap-x-[var(--spacing-lg)] gap-y-[var(--spacing-md)]">
            <span />
            {SIZES.map((size) => (
              <span key={size} className="text-overline text-ink-muted">
                {size}
              </span>
            ))}

            <span className="text-body-sm text-ink-muted">Default</span>
            {SIZES.map((size) => (
              <span key={size}>
                <Button variant={variant} size={size}>
                  {SAMPLE}
                </Button>
              </span>
            ))}

            <span className="text-body-sm text-ink-muted">Hover</span>
            {SIZES.map((size) => (
              <span key={size}>
                <Button variant={variant} size={size} className={HOVER[variant]}>
                  {SAMPLE}
                </Button>
              </span>
            ))}

            <span className="text-body-sm text-ink-muted">Disabled</span>
            {SIZES.map((size) => (
              <span key={size}>
                <Button variant={variant} size={size} disabled>
                  {SAMPLE}
                </Button>
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function UiPreviewButtonPage() {
  return (
    <main
      data-testid="ui-preview"
      className="mx-auto flex max-w-5xl flex-col gap-[var(--spacing-2xl)] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
    >
      <header className="flex flex-col gap-[var(--spacing-2xs)]">
        <h1 className="text-h2 text-ink-heading">Button</h1>
        <p className="text-body text-ink">Figma 15:56 · primary · secondary · ghost × sm · md · lg</p>
      </header>

      <div
        data-testid="matrix-light"
        className="rounded-[var(--radius-lg)] border border-line bg-page p-[var(--spacing-xl)]"
      >
        <Matrix />
      </div>

      {/* Nested data-theme re-declares the dark token block for this subtree. */}
      <div
        data-theme="dark"
        data-testid="matrix-dark"
        className="rounded-[var(--radius-lg)] border border-line bg-page p-[var(--spacing-xl)]"
      >
        <Matrix />
      </div>
    </main>
  );
}
