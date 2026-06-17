"use client";

import { useAdminLocale } from "../AdminLocaleProvider";
import { Languages } from "lucide-react";

/**
 * `onDark` (sidebar, navy bg) uses light text to meet AA contrast (M5.5); the
 * default (mobile header, light bg) keeps the dark slate text.
 */
export function AdminLocaleSwitcher({ onDark = false }: { onDark?: boolean }) {
  const { locale, toggleLocale } = useAdminLocale();

  return (
    <button
      onClick={toggleLocale}
      className={
        onDark
          ? "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          : "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      }
      title={locale === "bg" ? "Switch to English" : "Превключи на български"}
    >
      <Languages className="h-5 w-5" />
      <span className="uppercase">{locale}</span>
    </button>
  );
}
