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

  async function resolveTargetPath(relativePath: string): Promise<string | null> {
    const trimmed = relativePath.replace(/^\/+/g, "").replace(/\/+$/g, "");
    if (!trimmed) return "";
    const params = new URLSearchParams({ from: locale, to: nextLocale, path: trimmed });
    try {
      const res = await fetch(`/api/locale-path?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null) as { target?: string | null } | null;
      if (typeof data?.target === "string") return data.target;
      if (data?.target === "") return "";
    } catch {
      // ignore fetch errors and fall back to same slug
    }
    return null;
  }

  const handleToggle = () => {
    if (isPending) return;
    startTransition(() => {
      const stripped = pathname.replace(/^\/(?:bg|en)(?=\/|$)/, "");
      const relative = stripped.replace(/^\/+/g, "").replace(/\/+$/g, "");
      (async () => {
        let nextPath = relative;
        if (relative) {
          const translated = await resolveTargetPath(relative);
          if (translated !== null && translated !== undefined) {
            nextPath = translated;
          }
        } else {
          nextPath = "";
        }
        const targetPath = nextPath ? `/${nextPath}` : "/";
        try {
          document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
        } catch {}
        router.replace(targetPath, { locale: nextLocale });
      })();
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

