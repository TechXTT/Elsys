"use client";

import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/Button";

/**
 * 404 (Figma 76:3). Rendered by notFound() within the [locale] subtree, inside
 * the locale layout (header/footer + next-intl provider), so locale-aware Link
 * + translations work. One <h1> (the message); "404" is decorative display text.
 */
export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <section className="bg-subtle">
      <div className="container-page flex flex-col items-center gap-[var(--spacing-md)] py-[var(--spacing-4xl)] text-center">
        <p aria-hidden className="text-display text-ink-accent">404</p>
        <h1 className="text-h2 text-ink-heading">{t("title")}</h1>
        <p className="text-body-lg max-w-xl text-ink-muted">{t("message")}</p>
        <div className="mt-[var(--spacing-xs)] flex flex-wrap justify-center gap-[var(--spacing-sm)]">
          <ButtonLink variant="primary" size="lg" href="/">{t("home")}</ButtonLink>
          <ButtonLink variant="secondary" size="lg" href="/search">{t("search")}</ButtonLink>
        </div>
      </div>
    </section>
  );
}
