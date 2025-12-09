"use client";

import { useAdminLocale } from "../AdminLocaleProvider";
import { Languages } from "lucide-react";

export function AdminLocaleSwitcher() {
  const { locale, toggleLocale } = useAdminLocale();

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      title={locale === "bg" ? "Switch to English" : "Превключи на български"}
    >
      <Languages className="h-5 w-5" />
      <span className="uppercase">{locale}</span>
    </button>
  );
}
