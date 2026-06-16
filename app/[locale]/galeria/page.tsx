import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/cn";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { getGalleryItems } from "@/lib/gallery";
import { GalleryLightbox } from "./GalleryLightbox";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Gallery" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(params.locale, "/galeria") };
}

const ALBUMS = ["sabitiya", "olimpiadi", "ezhednevie", "abiturienti"] as const;
type Album = (typeof ALBUMS)[number];

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams?: { album?: string };
}) {
  const locale = params.locale;
  const [tGallery, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Gallery" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const all = await getGalleryItems(locale);
  const active = ALBUMS.includes(searchParams?.album as Album) ? (searchParams!.album as Album) : undefined;
  const items = active ? all.filter((g) => g.album === active) : all;
  const urlFor = (album?: string) => `/${locale}/galeria${album ? `?album=${album}` : ""}`;

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tGallery("title") }]}
      />
      <SectionHeading as="h1" title={tGallery("title")} description={tGallery("intro")} />

      <nav aria-label={tGallery("filterLabel")} className="flex flex-wrap gap-[var(--spacing-xs)]">
        {[{ label: tGallery("filterAll"), value: undefined as string | undefined }, ...ALBUMS.map((a) => ({ label: tGallery(`album.${a}` as never), value: a as string }))].map((chip) => {
          const isActive = chip.value === active;
          return (
            <a
              key={chip.label}
              href={urlFor(chip.value)}
              aria-current={isActive ? "true" : undefined}
              data-ui="gallery-filter"
              className={cn(
                "text-body-sm inline-flex items-center rounded-[var(--radius-full)] border px-[var(--spacing-md)] py-[var(--spacing-2xs)] no-underline transition-colors",
                isActive ? "border-transparent bg-[var(--color-action-primary)] text-ink-on-action" : "border-line bg-surface text-ink hover:bg-subtle",
              )}
            >
              {chip.label}
            </a>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <p className="text-body text-ink-muted">{tGallery("empty")}</p>
      ) : (
        <GalleryLightbox
          items={items.map((g) => ({ id: g.id, imageUrl: g.imageUrl, alt: g.alt, title: g.title }))}
          labels={{ close: tGallery("lightboxClose"), prev: tGallery("lightboxPrev"), next: tGallery("lightboxNext") }}
        />
      )}
    </div>
  );
}
