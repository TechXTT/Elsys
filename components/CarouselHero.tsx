"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

export function CarouselHero({ slides }: Props) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[current];

  return (
    <section className="relative h-[480px] w-full overflow-hidden sm:h-[560px] lg:h-[640px]" aria-label="Карусел">
      {/* Images */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          aria-hidden={i !== current}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            fill
            src={s.imageDesktop}
            alt=""
            sizes="100vw"
            priority={i === 0}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-end pb-16 text-center text-white px-4">
        <h2 className="text-3xl font-bold drop-shadow-lg sm:text-4xl lg:text-5xl">{slide.title}</h2>
        {slide.subtitle && (
          <p className="mt-3 max-w-2xl text-base text-white/90 drop-shadow sm:text-lg">{slide.subtitle}</p>
        )}
        {slide.linkUrl && slide.linkLabel && (
          <a
            href={slide.linkUrl}
            className="mt-6 inline-flex items-center rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
          >
            {slide.linkLabel}
          </a>
        )}
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Предишен слайд"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Следващ слайд"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Слайд ${i + 1}`}
                aria-current={i === current}
                className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
