import Image from "next/image";

import { cn } from "@/lib/cn";

interface TeamContact {
  /** mailto: / tel: / URL. */
  href: string;
  label: string;
}

interface TeamCardProps {
  name: string;
  role?: string;
  /** Photo URL; when omitted, a brand-tinted initials avatar is shown. */
  photo?: string;
  contact?: TeamContact;
  className?: string;
}

/** Derive up to two uppercase initials, skipping abbreviation prefixes (инж., д-р). */
function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !w.endsWith("."));
  const source = words.length ? words : name.split(/\s+/).filter(Boolean);
  return source
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * TeamCard (Figma 26:24) — photo or initials avatar (brand-tint fallback) +
 * name + role + optional contact link. Centred on a surface card.
 */
export function TeamCard({ name, role, photo, contact, className }: TeamCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center gap-[var(--spacing-xs)] rounded-[var(--radius-lg)] p-[var(--spacing-lg)] text-center",
        "border border-line bg-surface",
        className,
      )}
    >
      <span className="relative mb-[var(--spacing-2xs)] flex h-16 w-16 items-center justify-center overflow-hidden rounded-[var(--radius-full)] bg-brand-tint">
        {photo ? (
          <Image fill src={photo} alt="" sizes="64px" className="object-cover" />
        ) : (
          <span aria-hidden className="text-h4 text-ink-link">
            {initialsOf(name)}
          </span>
        )}
      </span>
      <p className="text-body font-semibold text-ink-heading">{name}</p>
      {role && <p className="text-body-sm text-ink-muted">{role}</p>}
      {contact && (
        <a
          href={contact.href}
          data-ui="team-card-contact"
          className="text-body-sm text-ink-link no-underline hover:underline"
        >
          {contact.label}
        </a>
      )}
    </div>
  );
}
