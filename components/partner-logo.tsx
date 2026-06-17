import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { isRemoteSrc } from "@/lib/image";

interface PartnerLogoProps {
  /** Partner name — used as the image alt / link accessible name. */
  name: string;
  logo: string;
  href?: string;
  /** Render desaturated (greyscale) until hover/focus. Figma 27:13 variant. */
  grayscale?: boolean;
  className?: string;
}

/**
 * PartnerLogo (Figma 27:13) — a bordered box holding a partner logo.
 * Variants: greyscale·colour. Becomes an external link when `href` is given.
 */
export function PartnerLogo({ name, logo, href, grayscale = false, className }: PartnerLogoProps) {
  const box = cn(
    "relative flex h-24 items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface p-[var(--spacing-md)]",
    href && "transition-[filter]",
    className,
  );

  const img: ReactNode = (
    <Image
      fill
      src={logo}
      alt={name}
      sizes="200px"
      unoptimized={isRemoteSrc(logo)}
      className={cn(
        "object-contain p-[var(--spacing-md)] transition-[filter]",
        grayscale && "grayscale hover:grayscale-0 focus-visible:grayscale-0",
      )}
    />
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" data-ui="partner-logo" className={box}>
        {img}
      </a>
    );
  }
  return <div className={box}>{img}</div>;
}
