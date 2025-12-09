"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  // Load saved locale from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("admin-locale") as Locale | null;
      if (saved && (saved === "bg" || saved === "en")) {
        setLocaleState(saved);
      } else {
        // Try to get from cookie
        const cookieLocale = document.cookie
          .split("; ")
          .find((row) => row.startsWith("NEXT_LOCALE="))
          ?.split("=")[1] as Locale | undefined;
        if (cookieLocale && (cookieLocale === "bg" || cookieLocale === "en")) {
          setLocaleState(cookieLocale);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("admin-locale", newLocale);
      // Also set cookie for consistency with site locale
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    } catch {
      // Ignore localStorage errors
    }
  }, []);

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
