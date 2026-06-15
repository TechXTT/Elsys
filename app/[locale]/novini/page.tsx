import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { JsonLd } from "@/components/JsonLd";
import { NewsCard } from "@/components/news-card";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import { colorTagToBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { Locale } from "@/i18n/config";
import { getNewsPosts } from "@/lib/news";
import { absoluteUrl, alternatesFor } from "@/lib/site";
import type { PostItem } from "@/lib/types";

const tagDot: Record<string, string> = {
  blue: "bg-tag-blue", green: "bg-tag-green", coral: "bg-tag-coral",
  purple: "bg-tag-purple", teal: "bg-tag-teal", amber: "bg-tag-amber",
};

export const revalidate = 300; // ISR; page 1 is the cached shell, ?page=N renders on demand.

const PER_PAGE = 6;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "News" });
  return { title: t("title"), description: t("metaDescription"), alternates: alternatesFor(params.locale, "/novini") };
}

export default async function NewsIndex({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams?: { page?: string; category?: string };
}) {
  const locale = params.locale;
  const [tNews, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "News" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  // Public read: getNewsPosts → cached list (memory→Redis→DB), explicit select,
  // publicWhere (PUBLISHED + date gate). Pagination slices the cached list.
  const all = await getNewsPosts(locale);

  // Distinct categories (label + colour) present in the published set → chips.
  const categories: { label: string; colorTag: PostItem["colorTag"] }[] = [];
  for (const p of all) {
    if (p.category && !categories.some((c) => c.label === p.category)) {
      categories.push({ label: p.category, colorTag: p.colorTag });
    }
  }
  const activeCategory =
    searchParams?.category && categories.some((c) => c.label === searchParams.category)
      ? searchParams.category
      : undefined;

  const filtered = activeCategory ? all.filter((p) => p.category === activeCategory) : all;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const requested = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(requested) ? Math.min(Math.max(1, Math.trunc(requested)), totalPages) : 1;
  const items = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const urlFor = (p: number, cat?: string) => {
    const qs: string[] = [];
    if (cat) qs.push(`category=${encodeURIComponent(cat)}`);
    if (p > 1) qs.push(`page=${p}`);
    return `/${locale}/novini${qs.length ? `?${qs.join("&")}` : ""}`;
  };
  const hrefFor = (p: number) => urlFor(p, activeCategory);

  const listJsonLd = items.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: items.map((n, i) => ({
          "@type": "ListItem",
          position: (page - 1) * PER_PAGE + i + 1,
          url: absoluteUrl(`/${locale}${n.href}`),
          name: n.title,
        })),
      }
    : null;

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      {listJsonLd && <JsonLd data={listJsonLd} />}

      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tNews("title") }]}
      />

      <h1 className="text-h1 text-ink-heading">{tNews("title")}</h1>

      {categories.length > 0 && (
        <nav aria-label={tNews("filterLabel")} className="flex flex-wrap gap-[var(--spacing-xs)]">
          {[{ label: tNews("filterAll"), value: undefined as string | undefined, colorTag: undefined as PostItem["colorTag"] }, ...categories.map((c) => ({ label: c.label, value: c.label, colorTag: c.colorTag }))].map((chip) => {
            const active = chip.value === activeCategory;
            return (
              <a
                key={chip.label}
                href={urlFor(1, chip.value)}
                aria-current={active ? "true" : undefined}
                data-ui="news-filter"
                className={cn(
                  "text-body-sm inline-flex items-center gap-[var(--spacing-2xs)] rounded-[var(--radius-full)] border px-[var(--spacing-md)] py-[var(--spacing-2xs)] no-underline transition-colors",
                  active
                    ? "border-transparent bg-[var(--color-action-primary)] text-ink-on-brand"
                    : "border-line bg-surface text-ink hover:bg-subtle",
                )}
              >
                {chip.colorTag && (
                  <span aria-hidden className={cn("h-1.5 w-1.5 rounded-[var(--radius-full)]", tagDot[colorTagToBadge(chip.colorTag)])} />
                )}
                {chip.label}
              </a>
            );
          })}
        </nav>
      )}

      {items.length === 0 ? (
        <p className="text-body text-ink-muted">{tNews("empty")}</p>
      ) : (
        <>
          <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => (
              <NewsCard key={n.id} post={n} locale={locale} category={n.colorTag} categoryLabel={n.category} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              hrefFor={hrefFor}
              label={tNews("paginationLabel")}
              previousLabel={tNews("previousPage")}
              nextLabel={tNews("nextPage")}
              className="pt-[var(--spacing-md)]"
            />
          )}
        </>
      )}
    </div>
  );
}
