"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const storageKey = "elsys-theme";

function getStoredTheme(): "dark" | "light" | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(storageKey);
  return value === "dark" || value === "light" ? value : null;
}

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light" | "system">("system");
  const [isMounted, setIsMounted] = useState(false);
  const t = useTranslations("Theme");

  const setDocumentTheme = useCallback((mode: "dark" | "light") => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
      root.dataset.theme = "dark";
      window.localStorage.setItem(storageKey, "dark");
      document.cookie = "theme=dark; path=/; max-age=31536000";
    } else {
      root.classList.remove("dark");
      root.dataset.theme = "light";
      window.localStorage.setItem(storageKey, "light");
      document.cookie = "theme=light; path=/; max-age=31536000";
    }
  }, []);

  const clearStoredTheme = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    document.cookie = "theme=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (theme === "system") {
      const systemTheme = getSystemPreference();
      setDocumentTheme(systemTheme);
      clearStoredTheme();
    } else {
      setDocumentTheme(theme);
    }
  }, [theme, isMounted, setDocumentTheme, clearStoredTheme]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const listener = (event: MediaQueryListEvent) => {
      if (getStoredTheme() === null) {
        const mode = event.matches ? "dark" : "light";
        setDocumentTheme(mode);
        setTheme("system");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [setDocumentTheme]);

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) {
      setTheme(stored);
      setDocumentTheme(stored);
    } else {
      const system = getSystemPreference();
      const root = document.documentElement;
      if (system === "dark") {
        root.classList.add("dark");
        root.dataset.theme = "dark";
      } else {
        root.classList.remove("dark");
        root.dataset.theme = "light";
      }
      clearStoredTheme();
      setTheme("system");
    }
    setIsMounted(true);
  }, [setDocumentTheme, clearStoredTheme]);

  const activeMode = isMounted ? (theme === "system" ? getSystemPreference() : theme) : "light";
  const targetMode: "dark" | "light" = activeMode === "dark" ? "light" : "dark";
  const currentLabel = targetMode === "dark" ? t("toDark") : t("toLight");

  const handleToggle = () => {
    if (!isMounted) return;
    const active = theme === "system" ? getSystemPreference() : theme;
    const next = active === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <button
      onClick={handleToggle}
      className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      type="button"
      aria-label={t("toggleAria")}
      title={currentLabel}
    >
      {/* Show the icon for the mode we will switch to (sun => light, moon => dark) */}
      {targetMode === "light" ? (
        // Sun icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
          <path
            fillRule="evenodd"
            d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm0 16.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM4.72 4.72a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06L4.72 5.78a.75.75 0 0 1 0-1.06Zm12.44 12.44a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM2.25 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Zm16.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM5.78 18.22a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.06 1.06L6.84 18.22a.75.75 0 0 1-1.06 0Zm9.36-9.36a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.06 1.06L16.2 9.86a.75.75 0 0 1-1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Moon icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M21.752 15.002A9.718 9.718 0 0 1 12 21.75 9.75 9.75 0 0 1 9.27 2.318a.75.75 0 0 1 .964.964A8.25 8.25 0 0 0 20.718 14.04a.75.75 0 0 1 1.034.962Z" />
        </svg>
      )}
      <span className="sr-only">{currentLabel}</span>
    </button>
  );
};
