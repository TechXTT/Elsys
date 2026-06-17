"use client";

import { Fragment, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Locale, locales } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/cn";

type Tone = "brand" | "surface";

/**
 * LanguageSwitcher (Figma 20:10) — BG | EN segmented control. Switches locale
 * via next-intl while preserving the current path (resolving the translated
 * slug through /api/locale-path). Active locale carries aria-current.
 */
export function LanguageSwitcher({ tone = "surface" }: { tone?: Tone }) {
  const t = useTranslations("Locale");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  async function resolveTargetPath(relativePath: string, target: Locale): Promise<string | null> {
    const trimmed = relativePath.replace(/^\/+/g, "").replace(/\/+$/g, "");
    if (!trimmed) return "";
    const params = new URLSearchParams({ from: locale, to: target, path: trimmed });
    try {
      const res = await fetch(`/api/locale-path?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json().catch(() => null)) as { target?: string | null } | null;
      if (typeof data?.target === "string") return data.target;
    } catch {
      // fall back to the same slug
    }
    return null;
  }

  const switchTo = (target: Locale) => {
    if (target === locale || isPending) return;
    startTransition(() => {
      const stripped = pathname.replace(/^\/(?:bg|en)(?=\/|$)/, "");
      const relative = stripped.replace(/^\/+/g, "").replace(/\/+$/g, "");
      (async () => {
        let nextPath = relative;
        if (relative) {
          const translated = await resolveTargetPath(relative, target);
          if (translated !== null && translated !== undefined) nextPath = translated;
        } else {
          nextPath = "";
        }
        try {
          document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000`;
        } catch {}
        router.replace(nextPath ? `/${nextPath}` : "/", { locale: target });
      })();
    });
  };

  const labels: Record<Locale, string> = { bg: t("bg"), en: t("en") };
  // AA: distinguish active via underline, not opacity (opacity dilutes the
  // on-brand text below the 4.5:1 contrast threshold). M5.5.
  const activeText = tone === "brand" ? "text-[var(--color-text-on-brand)] underline underline-offset-4" : "text-[var(--color-text-heading)] underline underline-offset-4";
  const inactiveText =
    tone === "brand"
      ? "text-[var(--color-text-on-brand)] hover:underline"
      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]";
  const separator = tone === "brand" ? "text-[var(--color-text-on-brand)] opacity-50" : "text-[var(--color-text-muted)]";

  return (
    <div role="group" aria-label={t("switcher")} className="inline-flex items-center gap-[var(--spacing-2xs)] text-body-sm font-semibold uppercase">
      {locales.map((loc, i) => {
        const active = loc === locale;
        return (
          <Fragment key={loc}>
            {i > 0 ? (
              <span aria-hidden className={separator}>
                |
              </span>
            ) : null}
            <button
              type="button"
              data-ui="lang"
              onClick={() => switchTo(loc)}
              disabled={isPending || active}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-[var(--radius-sm)] px-[var(--spacing-2xs)] transition-opacity disabled:cursor-default",
                active ? activeText : inactiveText,
              )}
            >
              {labels[loc]}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
