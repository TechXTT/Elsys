"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { readConsent, writeConsent } from "@/lib/consent";

/**
 * Cookie consent banner + preferences modal (G5-4, Figma 106:2/106:13).
 * Necessary cookies are always on; analytics is opt-in. Shown until a choice is
 * persisted; reopenable from the footer ("Бисквитки").
 */
export function CookieConsent() {
  const t = useTranslations("Consent");
  const [decided, setDecided] = useState(true); // assume decided until mount check
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const c = readConsent();
    setDecided(!!c);
    setAnalytics(c?.analytics ?? false);
    const open = () => setPrefsOpen(true);
    window.addEventListener("open-cookie-prefs", open);
    return () => window.removeEventListener("open-cookie-prefs", open);
  }, []);

  function persist(a: boolean) {
    writeConsent(a);
    setAnalytics(a);
    setDecided(true);
    setPrefsOpen(false);
  }

  if (decided && !prefsOpen) return null;

  return (
    <>
      {!decided && !prefsOpen && (
        <div role="region" aria-label={t("title")} data-ui="cookie-banner"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface p-[var(--spacing-lg)] shadow-2xl">
          <div className="container-page flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-h4 text-ink-heading">{t("title")}</p>
              <p className="text-body-sm text-ink-muted">
                {t("bannerText")} <Link href="/biskvitki" className="text-ink-link underline">{t("policyLink")}</Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPrefsOpen(true)} className="rounded-[var(--radius-md)] border border-line px-4 py-2 text-body-sm text-ink hover:bg-subtle">{t("settings")}</button>
              <button type="button" onClick={() => persist(false)} className="rounded-[var(--radius-md)] border border-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-[var(--color-action-primary)]">{t("necessaryOnly")}</button>
              <button type="button" data-ui="accept-all" onClick={() => persist(true)} className="rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-ink-on-action">{t("acceptAll")}</button>
            </div>
          </div>
        </div>
      )}

      {prefsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={t("prefsTitle")} onClick={() => setPrefsOpen(false)}>
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-h3 text-ink-heading">{t("prefsTitle")}</h2>
              <button type="button" onClick={() => setPrefsOpen(false)} aria-label={t("close")} className="rounded p-1 text-ink-muted hover:bg-subtle"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-[var(--radius-md)] bg-subtle p-4">
                <div className="flex items-center justify-between">
                  <span className="text-body font-medium text-ink-heading">{t("necessary")} <span className="text-caption font-normal text-ink-muted">{t("alwaysOn")}</span></span>
                  <input type="checkbox" checked disabled aria-label={t("necessary")} />
                </div>
                <p className="mt-1 text-body-sm text-ink-muted">{t("necessaryDesc")}</p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-subtle p-4">
                <label className="flex items-center justify-between">
                  <span className="text-body font-medium text-ink-heading">{t("analytics")}</span>
                  <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} data-ui="analytics-toggle" />
                </label>
                <p className="mt-1 text-body-sm text-ink-muted">{t("analyticsDesc")}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" data-ui="save-prefs" onClick={() => persist(analytics)} className="rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-4 py-2 text-body-sm font-medium text-ink-on-action">{t("save")}</button>
              <button type="button" onClick={() => persist(true)} className="rounded-[var(--radius-md)] border border-line px-4 py-2 text-body-sm text-ink hover:bg-subtle">{t("acceptAll")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
