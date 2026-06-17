"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { cn } from "@/lib/cn";
import { isRemoteSrc } from "@/lib/image";

export interface CarouselSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  imageDesktop: string;
  imageTablet?: string | null;
  imagePhone?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
}

interface Props {
  slides: CarouselSlide[];
}

const AUTO_ADVANCE_MS = 6000; // ≥5s (WCAG 2.2.2 — no rapid auto-advance)

/**
 * CarouselHero (Figma 29:11) — on-brand hero carousel over bg-header (brand/600,
 * white text 6.1:1). WCAG-compliant per design-system.md §3: labelled slide
 * groups, visible Pause/Play, no auto-advance under 5s, pause on hover/focus,
 * prefers-reduced-motion disables auto-advance, keyboard arrows, dot buttons
 * with aria-current.
 */
export function CarouselHero({ slides }: Props) {
  const t = useTranslations("Carousel");
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const regionRef = useRef<HTMLElement>(null);

  const total = slides.length;
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);

  // Honour prefers-reduced-motion: only enable auto-advance when motion is OK.
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (media && !media.matches) setIsPlaying(true);
  }, []);

  const autoActive = isPlaying && !isPaused && total > 1;
  useEffect(() => {
    if (!autoActive) return;
    const timer = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoActive, next, current]);

  if (total === 0) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (total <= 1) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    }
  };

  const ctlBase =
    "flex h-11 w-11 items-center justify-center rounded-[var(--radius-full)] bg-surface text-ink-link shadow-card transition-colors hover:bg-brand-tint";

  return (
    <section
      ref={regionRef}
      aria-roledescription={t("carousel")}
      aria-label={t("region")}
      data-ui="carousel-hero"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsPaused(false);
      }}
      className="relative isolate min-h-[360px] overflow-hidden bg-header sm:min-h-[420px] lg:min-h-[460px]"
    >
      {slides.map((slide, i) => {
        const active = i === current;
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription={t("slide")}
            aria-label={t("slideLabel", { n: i + 1, total })}
            aria-hidden={!active}
            // React 18 renders boolean inert as inert="true" and warns; the DOM wants
            // the empty-string boolean attribute. Cast satisfies the typed-boolean prop
            // while emitting inert="" at runtime (omitted entirely when the slide is active).
            inert={!active ? ("" as unknown as boolean) : undefined}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              active ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {/* Decorative imagery sits on the right at lg+, never under the text,
                so on-brand text stays on solid bg-header (6.1:1). */}
            <div aria-hidden className="absolute inset-y-0 right-0 hidden w-1/2 lg:block">
              <Image fill src={slide.imageDesktop} alt="" sizes="50vw" className="object-cover" priority={i === 0} unoptimized={isRemoteSrc(slide.imageDesktop)} />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-header)] to-transparent" />
            </div>

            <div className="container-page relative flex h-full min-h-[360px] max-w-3xl flex-col justify-center gap-[var(--spacing-md)] py-[var(--spacing-3xl)] sm:min-h-[420px] lg:min-h-[460px]">
              <h2 className="text-h1 lg:text-display text-ink-on-brand">{slide.title}</h2>
              {slide.subtitle && <p className="text-body-lg max-w-xl text-ink-on-brand">{slide.subtitle}</p>}
              {slide.linkUrl && slide.linkLabel && (
                <span>
                  <a
                    href={slide.linkUrl}
                    data-ui="carousel-cta"
                    tabIndex={active ? undefined : -1}
                    className="text-body inline-flex items-center rounded-[var(--radius-md)] bg-surface px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-semibold text-ink-link no-underline transition-colors hover:bg-brand-tint"
                  >
                    {slide.linkLabel}
                  </a>
                </span>
              )}
            </div>
          </div>
        );
      })}

      {total > 1 && (
        <>
          <button type="button" onClick={prev} aria-label={t("previous")} data-ui="carousel-prev" className={cn(ctlBase, "absolute left-[var(--spacing-md)] top-1/2 -translate-y-1/2")}>
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button type="button" onClick={next} aria-label={t("next")} data-ui="carousel-next" className={cn(ctlBase, "absolute right-[var(--spacing-md)] top-1/2 -translate-y-1/2")}>
            <ChevronRight size={20} aria-hidden />
          </button>

          <div className="container-page absolute inset-x-0 bottom-[var(--spacing-lg)] flex items-center gap-[var(--spacing-md)]">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? t("pause") : t("play")}
              data-ui="carousel-pause"
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-full)] text-ink-on-brand hover:bg-[color-mix(in_srgb,var(--color-text-on-brand)_18%,transparent)]"
            >
              {isPlaying ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
            </button>
            <div className="flex items-center gap-[var(--spacing-xs)]">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={t("slideLabel", { n: i + 1, total })}
                  aria-current={i === current}
                  data-ui="carousel-dot"
                  className="flex h-11 items-center px-[var(--spacing-2xs)]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-2 rounded-[var(--radius-full)] transition-all",
                      i === current ? "w-6 bg-[var(--color-text-on-brand)]" : "w-2 bg-[color-mix(in_srgb,var(--color-text-on-brand)_45%,transparent)]",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
