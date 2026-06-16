import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Badge, type BadgeColor } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SearchBar } from "@/components/ui/SearchBar";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { searchContent, type SearchType } from "@/lib/search";

// Results vary by query → not statically cached; keep it out of the index.
export const metadata: Metadata = { robots: { index: false, follow: true } };

const typeBadge: Record<SearchType, { color: BadgeColor; key: string }> = {
  news: { color: "coral", key: "typeNews" },
  page: { color: "blue", key: "typePage" },
};

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams?: { q?: string };
}) {
  const locale = params.locale;
  const [tSearch, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Search" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const q = (searchParams?.q ?? "").trim();
  const results = q ? await searchContent(locale, q) : [];

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tSearch("title") }]}
      />
      <h1 className="text-h1 text-ink-heading">{tSearch("title")}</h1>

      <SearchBar
        label={tSearch("title")}
        placeholder={tSearch("placeholder")}
        action={`/${locale}/search`}
        defaultValue={q}
      />

      {!q ? (
        <p className="text-body text-ink-muted">{tSearch("prompt")}</p>
      ) : results.length === 0 ? (
        <p className="text-body text-ink-muted">{tSearch("empty", { query: q })}</p>
      ) : (
        <>
          <p className="text-body-sm text-ink-muted" aria-live="polite">
            {tSearch("count", { count: results.length, query: q })}
          </p>
          <ul data-testid="search-results" className="flex flex-col gap-[var(--spacing-sm)]">
            {results.map((r, i) => (
              <li key={i} className="flex flex-col gap-[var(--spacing-2xs)] rounded-[var(--radius-lg)] border border-line bg-surface p-[var(--spacing-lg)]">
                <div className="flex items-center gap-[var(--spacing-sm)]">
                  <Badge color={typeBadge[r.type].color} size="sm">{tSearch(typeBadge[r.type].key)}</Badge>
                  <Link href={r.href} className="text-body-lg font-semibold text-ink-link no-underline hover:underline">
                    {r.title}
                  </Link>
                </div>
                {r.snippet && <p className="text-body-sm text-ink-muted">…{r.snippet}…</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
