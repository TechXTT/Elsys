import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Badge, type BadgeColor } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";

import { FormDemo } from "./FormDemo";

// Design-system catalog — a successor-facing reference (generational-turnover
// constraint), not production UI. noindex + absent from sitemap.ts. Sample
// copy is intentionally literal: dev tool, exempt from next-intl.
export const metadata: Metadata = {
  title: "UI Preview",
  robots: { index: false, follow: false },
};

const SAMPLE = "Бутон";
const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost"];
const SIZES: ButtonSize[] = ["sm", "md", "lg"];
const BADGE_COLOURS: BadgeColor[] = ["blue", "green", "coral", "purple", "teal", "amber"];

const HOVER: Record<ButtonVariant, string> = {
  primary: "!bg-[var(--color-action-primary-hover)]",
  secondary: "!bg-[var(--color-bg-brand-tint)]",
  ghost: "!bg-[var(--color-bg-brand-tint)]",
};

function Panel({
  dark,
  testId,
  children,
}: {
  dark?: boolean;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div
      {...(dark ? { "data-theme": "dark" } : {})}
      {...(testId ? { "data-testid": testId } : {})}
      className="rounded-[var(--radius-lg)] border border-line bg-page p-[var(--spacing-xl)]"
    >
      {children}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section data-testid={id} className="flex flex-col gap-[var(--spacing-md)]">
      <h2 className="text-h3 text-ink-heading">{title}</h2>
      {children}
    </section>
  );
}

function ButtonMatrix() {
  return (
    <div className="flex flex-col gap-[var(--spacing-xl)]">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col gap-[var(--spacing-md)]">
          <h3 className="text-h4 capitalize text-ink-heading">{variant}</h3>
          <div className="grid grid-cols-[7rem_repeat(3,minmax(0,1fr))] items-center gap-x-[var(--spacing-lg)] gap-y-[var(--spacing-md)]">
            <span />
            {SIZES.map((size) => (
              <span key={size} className="text-overline text-ink-muted">
                {size}
              </span>
            ))}
            {(["Default", "Hover", "Disabled"] as const).map((state) => (
              <ButtonRow key={state} variant={variant} state={state} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ButtonRow({ variant, state }: { variant: ButtonVariant; state: "Default" | "Hover" | "Disabled" }) {
  return (
    <>
      <span className="text-body-sm text-ink-muted">{state}</span>
      {SIZES.map((size) => (
        <span key={size}>
          <Button
            variant={variant}
            size={size}
            disabled={state === "Disabled"}
            className={state === "Hover" ? HOVER[variant] : undefined}
          >
            {SAMPLE}
          </Button>
        </span>
      ))}
    </>
  );
}

function BadgeGrid() {
  return (
    <div className="flex flex-wrap gap-x-[var(--spacing-lg)] gap-y-[var(--spacing-md)]">
      {BADGE_COLOURS.map((color) => (
        <div key={color} className="flex items-center gap-[var(--spacing-sm)]">
          <Badge color={color} size="sm">
            Новини
          </Badge>
          <Badge color={color} size="md">
            Новини
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default function UiPreviewPage() {
  return (
    <div
      data-testid="ui-preview"
      className="mx-auto flex max-w-5xl flex-col gap-[var(--spacing-2xl)] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
    >
      <header className="flex flex-col gap-[var(--spacing-2xs)]">
        <h1 className="text-h2 text-ink-heading">UI primitives</h1>
        <p className="text-body text-ink">Phase B · diff each against its Figma node.</p>
      </header>

      <div id="preview-content" className="flex flex-col gap-[var(--spacing-3xl)]">
        <Section id="preview-button" title="Button · 15:56">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="button-light">
              <ButtonMatrix />
            </Panel>
            <Panel dark testId="button-dark">
              <ButtonMatrix />
            </Panel>
          </div>
        </Section>

        <Section id="preview-badge" title="Badge · 35:38">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="badge-light">
              <BadgeGrid />
            </Panel>
            <Panel dark testId="badge-dark">
              <BadgeGrid />
            </Panel>
          </div>
        </Section>

        <Section id="preview-form" title="FormField · Input · Select · Textarea · 17:10 / 18:2">
          <Panel>
            <FormDemo />
          </Panel>
        </Section>

        <Section id="preview-searchbar" title="SearchBar · 18:7">
          <Panel>
            <div className="flex flex-wrap items-center gap-[var(--spacing-lg)]">
              <div className="w-80 max-w-full">
                <SearchBar label="Търсене" placeholder="Търсене..." />
              </div>
              <SearchBar label="Търсене" variant="collapsed" />
            </div>
          </Panel>
        </Section>

        <Section id="preview-pagination" title="Pagination · 19:8">
          <Panel>
            <Pagination
              page={3}
              totalPages={10}
              hrefFor={(p) => `?page=${p}`}
              label="Странициране"
              previousLabel="Предишна страница"
              nextLabel="Следваща страница"
            />
          </Panel>
        </Section>

        <Section id="preview-breadcrumbs" title="Breadcrumbs · 19:2">
          <Panel>
            <Breadcrumbs
              label="Навигация"
              items={[
                { label: "Начало", href: "/bg" },
                { label: "Прием", href: "/bg/priem" },
                { label: "Документи" },
              ]}
            />
          </Panel>
        </Section>

        <Section id="preview-skiplink" title="SkipLink · 19:19">
          <Panel>
            <p className="text-body-sm text-ink-muted">
              Visually hidden until focused — Tab from the top of the page to reveal it
              (it&apos;s the first focusable element).
            </p>
          </Panel>
        </Section>
      </div>
    </div>
  );
}
