import Image from "next/image";

import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { isRemoteSrc } from "@/lib/image";
import { Badge } from "@/components/ui/Badge";

interface ProjectCardProps {
  title: string;
  description?: string;
  image?: string;
  category?: string;
  href?: string;
  external?: boolean;
  locale?: Locale;
  className?: string;
}

/**
 * ProjectCard (Figma 112:2) — cover image, category Badge, title, description.
 * Whole card is a link when `href` is given.
 */
export function ProjectCard({ title, description, image, category, href, external, locale, className }: ProjectCardProps) {
  const inner = (
    <>
      <div className="relative aspect-[16/9] w-full bg-subtle">
        {image && (
          <Image fill src={image} alt="" className="object-cover" sizes="(min-width: 1024px) 360px, 100vw" unoptimized={isRemoteSrc(image)} />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-[var(--spacing-sm)] p-[var(--spacing-lg)]">
        {category && <Badge color="blue" className="w-fit">{category}</Badge>}
        <h3 className="text-h4 text-ink-heading">{title}</h3>
        {description && <p className="text-body-sm text-ink-muted">{description}</p>}
      </div>
    </>
  );

  const shell = cn(
    "flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface",
    href && "no-underline transition-colors hover:border-line-strong",
    className,
  );

  if (href && external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={shell}>{inner}</a>;
  }
  if (href) {
    return <Link href={href as never} locale={locale} className={shell}>{inner}</Link>;
  }
  return <article className={shell}>{inner}</article>;
}
