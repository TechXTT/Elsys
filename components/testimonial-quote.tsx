import Image from "next/image";

import { cn } from "@/lib/cn";
import { isRemoteSrc } from "@/lib/image";

interface TestimonialQuoteProps {
  quote: string;
  name: string;
  /** Secondary line, e.g. "Випуск 2015 · софтуерен инженер". */
  meta?: string;
  /** Author photo; when omitted, a brand-tinted initials avatar is shown. */
  photo?: string;
  className?: string;
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !w.endsWith("."));
  const source = words.length ? words : name.split(/\s+/).filter(Boolean);
  return source
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * TestimonialQuote (Figma 28:8) — a single quote with an author row, on a
 * subtle card. Variant: with-photo (else initials avatar).
 */
export function TestimonialQuote({ quote, name, meta, photo, className }: TestimonialQuoteProps) {
  return (
    <figure
      className={cn(
        "flex h-full flex-col gap-[var(--spacing-lg)] rounded-[var(--radius-lg)] bg-subtle p-[var(--spacing-xl)]",
        className,
      )}
    >
      <blockquote className="text-body-lg text-ink-heading">{`„${quote}“`}</blockquote>
      <figcaption className="mt-auto flex items-center gap-[var(--spacing-sm)]">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-full)] bg-brand-tint">
          {photo ? (
            <Image fill src={photo} alt="" sizes="44px" className="object-cover" unoptimized={isRemoteSrc(photo)} />
          ) : (
            <span aria-hidden className="text-body-sm font-semibold text-ink-link">
              {initialsOf(name)}
            </span>
          )}
        </span>
        <span className="flex flex-col">
          <span className="text-body-sm font-semibold text-ink-heading">{name}</span>
          {meta && <span className="text-caption text-ink-muted">{meta}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
