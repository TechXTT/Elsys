"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IntlProvider } from "next-intl";
import { Locale, defaultLocale } from "@/i18n/config";

// Import messages statically to avoid dynamic imports issues
import enMessages from "@/messages/en.json";
import bgMessages from "@/messages/bg.json";

const messages: Record<Locale, typeof enMessages> = {
  en: enMessages,
  bg: bgMessages,
};

interface AdminLocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const AdminLocaleContext = createContext<AdminLocaleContextType | null>(null);

export function useAdminLocale() {
  const context = useContext(AdminLocaleContext);
  if (!context) {
    throw new Error("useAdminLocale must be used within AdminLocaleProvider");
  }
  return context;
}

interface AdminLocaleProviderProps {
  children: ReactNode;
}

export function AdminLocaleProvider({ children }: AdminLocaleProviderProps) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  // Load saved admin locale on mount. Source of truth = the `admin-locale`
  // cookie (also read by the server in i18n/request.ts); localStorage is a
  // fallback. NEVER reads NEXT_LOCALE — that belongs to the public path-driven
  // locale and must not leak into admin.
  useEffect(() => {
    setMounted(true);
    try {
      const cookieLocale = document.cookie
        .split("; ")
        .find((row) => row.startsWith("admin-locale="))
        ?.split("=")[1] as Locale | undefined;
      const saved = (localStorage.getItem("admin-locale") as Locale | null) ?? cookieLocale ?? null;
      if (saved === "bg" || saved === "en") setLocaleState(saved);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("admin-locale", newLocale);
      // Admin-only cookie (NOT NEXT_LOCALE): the server reads this in
      // i18n/request.ts so server-rendered admin pages match the toggle.
      document.cookie = `admin-locale=${newLocale}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Ignore storage errors
    }
    // Re-render server components with the new locale immediately.
    router.refresh();
  }, [router]);

  const toggleLocale = useCallback(() => {
    const newLocale = locale === "bg" ? "en" : "bg";
    setLocale(newLocale);
  }, [locale, setLocale]);

  // Use defaultLocale until mounted to prevent hydration mismatch
  const activeLocale = mounted ? locale : defaultLocale;

  return (
    <AdminLocaleContext.Provider value={{ locale: activeLocale, setLocale, toggleLocale }}>
      <IntlProvider locale={activeLocale} messages={messages[activeLocale]} timeZone="Europe/Sofia">
        {children}
      </IntlProvider>
    </AdminLocaleContext.Provider>
  );
}
