"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Locale, locales } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("Locale");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentIndex = locales.findIndex((item) => item === locale);
  const nextLocale = locales[(currentIndex + 1) % locales.length];

  const handleToggle = () => {
    if (isPending) return;
    startTransition(() => {
      const stripped = pathname.replace(/^\/(?:bg|en)(?=\/|$)/, "");
      const normalized = stripped === "" ? "/" : stripped;
      // Use router.replace with locale option instead of manually prefixing the path.
      // When using next-intl's createNavigation with localePrefix="always" the router
      // will add the correct locale prefix. Passing a path that already contains a
      // locale can produce duplicates (e.g. /bg/en/...). So pass the stripped path
      // and let the router set the locale.
      const targetPath = normalized === "/" ? "/" : normalized;
      // Persist the chosen locale for routes that don't include a locale segment (e.g., /admin)
      try {
        document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
      } catch {}
      router.replace(targetPath, { locale: nextLocale });
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={t("switcher")}
      className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium uppercase tracking-wide shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {isPending ? locale.toUpperCase() : nextLocale.toUpperCase()}
    </button>
  );
}

