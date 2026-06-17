import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { GalleryTile } from "@/components/gallery-tile";
import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/cn";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Gallery" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(params.locale, "/galeria") };
}

// TODO(E3): source from a GalleryItem model + Vercel Blob. Static for now.
const ALBUMS = ["sabitiya", "olimpiadi", "ezhednevie", "abiturienti"] as const;
type Album = (typeof ALBUMS)[number];
const GALLERY: { image: string; caption: string; album: Album }[] = [
  { image: "/images/news/open-doors.svg", caption: "Ден на отворените врати 2026", album: "sabitiya" },
  { image: "/images/news/olympiad-medals.svg", caption: "Национална олимпиада", album: "olimpiadi" },
  { image: "/images/news/robotics-lab.svg", caption: "Робофест 2026", album: "sabitiya" },
  { image: "/images/news/graduation-2026.svg", caption: "Първи учебен ден", album: "ezhednevie" },
  { image: "/images/news/workshops.svg", caption: "Лятна академия", album: "ezhednevie" },
  { image: "/images/news/alumni-meetup.svg", caption: "Абитуриентски бал", album: "abiturienti" },
  { image: "/images/news/hackathon-2026.svg", caption: "Хакатон 48ч", album: "sabitiya" },
  { image: "/images/news/partnership.svg", caption: "Посещение в CERN", album: "olimpiadi" },
];

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

  const active = ALBUMS.includes(searchParams?.album as Album) ? (searchParams!.album as Album) : undefined;
  const items = active ? GALLERY.filter((g) => g.album === active) : GALLERY;
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
                isActive ? "border-transparent bg-[var(--color-action-primary)] text-ink-on-brand" : "border-line bg-surface text-ink hover:bg-subtle",
              )}
            >
              {chip.label}
            </a>
          );
        })}
      </nav>

      <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-4">
        {items.map((g, i) => (
          <GalleryTile key={i} image={g.image} alt={g.caption} caption={g.caption} />
        ))}
      </div>
    </div>
  );
}
