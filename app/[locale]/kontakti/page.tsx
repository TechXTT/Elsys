import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { Locale } from "@/i18n/config";
import { alternatesFor } from "@/lib/site";
import { ContactForm } from "./ContactForm";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Contact" });
  return { title: t("title"), description: t("intro"), alternates: alternatesFor(params.locale, "/kontakti") };
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--spacing-2xs)]">
      <span className="text-overline text-ink-muted">{label}</span>
      <span className="text-body text-ink">{children}</span>
    </div>
  );
}

export default async function ContactPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "Contact" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);

  return (
    <div className="container-page flex flex-col gap-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
      <Breadcrumbs
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: `/${locale}` }, { label: t("title") }]}
      />
      <div className="flex flex-col gap-[var(--spacing-sm)]">
        <h1 className="text-h1 text-ink-heading">{t("title")}</h1>
        <p className="text-body-lg max-w-2xl text-ink-muted">{t("intro")}</p>
      </div>

      <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-[1fr_22rem]">
        <ContactForm />

        <aside className="flex flex-col gap-[var(--spacing-lg)]">
          <div className="flex flex-col gap-[var(--spacing-md)] rounded-[var(--radius-lg)] bg-subtle p-[var(--spacing-lg)]">
            <InfoRow label={t("addressLabel")}>{t("address")}</InfoRow>
            <InfoRow label={t("phoneLabel")}>
              <a href="tel:+35929653293" className="text-ink-link no-underline hover:underline">{t("phone")}</a>
            </InfoRow>
            <InfoRow label={t("emailLabel")}>
              <a href="mailto:info@elsys-bg.org" className="text-ink-link no-underline hover:underline">{t("emailValue")}</a>
            </InfoRow>
            <InfoRow label={t("hoursLabel")}>{t("hours")}</InfoRow>
          </div>
          <div
            aria-hidden
            className="flex aspect-[4/3] items-center justify-center rounded-[var(--radius-lg)] bg-subtle text-body-sm text-ink-muted"
          >
            {t("mapPlaceholder")}
          </div>
        </aside>
      </div>
    </div>
  );
}
