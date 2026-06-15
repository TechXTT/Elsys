import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { JsonLd } from "@/components/JsonLd";
import { NewsCard } from "@/components/news-card";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Pagination } from "@/components/ui/Pagination";
import type { Locale } from "@/i18n/config";
import { getNewsPosts } from "@/lib/news";
import { absoluteUrl, alternatesFor } from "@/lib/site";

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
  searchParams?: { page?: string };
}) {
  const locale = params.locale;
  const [tNews, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "News" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  // Public read: getNewsPosts → cached list (memory→Redis→DB), explicit select,
  // publicWhere (PUBLISHED + date gate). Pagination slices the cached list.
  const all = await getNewsPosts(locale);
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const requested = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(requested) ? Math.min(Math.max(1, Math.trunc(requested)), totalPages) : 1;
  const items = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const hrefFor = (p: number) => (p <= 1 ? `/${locale}/novini` : `/${locale}/novini?page=${p}`);

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

      {items.length === 0 ? (
        <p className="text-body text-ink-muted">{tNews("empty")}</p>
      ) : (
        <>
          <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => (
              <NewsCard key={n.id} post={n} locale={locale} />
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
