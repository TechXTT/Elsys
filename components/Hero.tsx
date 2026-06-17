import Image from "next/image";

import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { isRemoteSrc } from "@/lib/image";

interface HeroCTA {
  label: string;
  href: string;
}

interface HeroProps {
  heading: string;
  subheading?: string;
  /** Small accent line above the heading (e.g. "ТУЕС · ОТ 1991"). */
  eyebrow?: string;
  image?: string;
  imageLarge?: string;
  cta?: HeroCTA;
  secondaryCta?: HeroCTA;
}

/**
 * next/image rejects relative srcs ("./images/x"). Teacher-edited content may
 * carry a stray "./" — coerce it to a public-root path so it never crashes the
 * page. Absolute (http(s)) and root-relative ("/…") srcs pass through.
 */
function normalizeImageSrc(src: string): string {
  if (/^https?:\/\//.test(src) || src.startsWith("/")) return src;
  return "/" + src.replace(/^\.?\/*/, "");
}

/** Internal hrefs are locale-relative for next-intl; strip any locale prefix. */
function normalizeHref(href: string): { href: string; external: boolean } {
  if (/^https?:\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return { href, external: true };
  }
  return { href: href.replace(/^\/(?:bg|en)(?=\/|$)/, "") || "/", external: false };
}

function HeroCtas({ cta, secondaryCta }: { cta?: HeroCTA; secondaryCta?: HeroCTA }) {
  if (!cta && !secondaryCta) return null;
  return (
    <div className="mt-[var(--spacing-xs)] flex flex-wrap gap-[var(--spacing-sm)]">
      {cta && (
        <ButtonLink variant="primary" size="lg" {...normalizeHref(cta.href)}>
          {cta.label}
        </ButtonLink>
      )}
      {secondaryCta && (
        <ButtonLink variant="secondary" size="lg" {...normalizeHref(secondaryCta.href)}>
          {secondaryCta.label}
        </ButtonLink>
      )}
    </div>
  );
}

/**
 * Hero (Figma 29:2) — bg-subtle section with a Display heading, body-lg lead,
 * and primary + secondary CTAs. Variants: plain (centred) and with-image
 * (two-column). The grey block in Figma is a placeholder; real imagery is
 * wired via next/image.
 */
export default function Hero({ heading, subheading, eyebrow, image, imageLarge, cta, secondaryCta }: HeroProps) {
  const rawPhoto = imageLarge ?? image;
  const photo = rawPhoto ? normalizeImageSrc(rawPhoto) : undefined;

  const copy = (
    <div className={cn("flex flex-col gap-[var(--spacing-md)]", !photo && "items-center text-center")}>
      {eyebrow && <span className="text-overline text-ink-accent">{eyebrow}</span>}
      <h1 className="text-h1 sm:text-display text-ink-heading">{heading}</h1>
      {subheading && <p className="text-body-lg max-w-2xl text-ink-muted">{subheading}</p>}
      <HeroCtas cta={cta} secondaryCta={secondaryCta} />
    </div>
  );

  return (
    <section className="rounded-[var(--radius-lg)] bg-subtle">
      <div className="container-page py-[var(--spacing-3xl)]">
        {photo ? (
          <div className="grid items-center gap-[var(--spacing-2xl)] lg:grid-cols-2">
            {copy}
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)]">
              <Image fill src={photo} alt="" sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" priority unoptimized={isRemoteSrc(photo)} />
            </div>
          </div>
        ) : (
          copy
        )}
      </div>
    </section>
  );
}
