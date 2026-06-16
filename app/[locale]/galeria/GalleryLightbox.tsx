"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { GalleryTile } from "@/components/gallery-tile";
import { isRemoteSrc } from "@/lib/image";

export interface LightboxItem {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
}

interface Props {
  items: LightboxItem[];
  labels: { close: string; prev: string; next: string };
}

/** Gallery grid + accessible lightbox modal (G2-2 type). */
export function GalleryLightbox({ items, labels }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (dir: 1 | -1) => setOpen((i) => (i === null ? i : (i + dir + items.length) % items.length)),
    [items.length]
  );

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, go]);

  const active = open !== null ? items[open] : null;

  return (
    <>
      <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpen(i)}
            className="block rounded-[var(--radius-lg)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-primary)]"
            aria-haspopup="dialog"
          >
            <GalleryTile image={item.imageUrl} alt={item.alt} caption={item.title} />
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
          <button type="button" onClick={close} aria-label={labels.close} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
          {items.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label={labels.prev} className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label={labels.next} className="absolute right-4 bottom-1/2 translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}
          <figure className="relative flex max-h-[85vh] max-w-4xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-[70vh] w-[85vw] max-w-4xl">
              <Image fill src={active.imageUrl} alt={active.alt} className="object-contain" unoptimized={isRemoteSrc(active.imageUrl)} sizes="85vw" />
            </div>
            {active.title && <figcaption className="text-body-sm text-white">{active.title}</figcaption>}
          </figure>
        </div>
      )}
    </>
  );
}
