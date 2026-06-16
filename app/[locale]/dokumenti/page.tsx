import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";

import { DocumentRow } from "@/components/document-row";
import { SectionHeading } from "@/components/Section";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { getDocuments, type DocItem } from "@/lib/documents";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Documents" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(params.locale, "/dokumenti") };
}

export default async function DocumentsPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [tDocs, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Documents" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  const docs = await getDocuments(locale);

  // Group by category, preserving insertion (ordered) sequence.
  const groups = new Map<string, DocItem[]>();
  for (const d of docs) {
    const key = d.category?.trim() || tDocs("uncategorized");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-xl)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: tDocs("title") }]}
      />
      <SectionHeading as="h1" title={tDocs("title")} description={tDocs("intro")} />

      {docs.length === 0 ? (
        <p className="text-body text-ink-muted">{tDocs("empty")}</p>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-2xl)]">
          {Array.from(groups.entries()).map(([category, items]) => (
            <section key={category} className="flex flex-col gap-[var(--spacing-md)]">
              <h2 className="text-h3 text-ink-heading">{category}</h2>
              <div className="flex flex-col gap-[var(--spacing-sm)]">
                {items.map((d) => (
                  <DocumentRow
                    key={d.id}
                    name={d.title}
                    href={d.fileUrl}
                    fileType={d.fileType}
                    size={d.fileSize}
                    icon={
                      <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-tag-tint-coral text-tag-ink-coral">
                        <FileText size={18} aria-hidden />
                      </span>
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
