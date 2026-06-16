"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/cn";

const storageKey = "elsys-theme";

type Tone = "brand" | "surface";

function getStoredTheme(): "dark" | "light" | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(storageKey);
  return value === "dark" || value === "light" ? value : null;
}

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * ThemeToggle (Figma 20:17) — a pill switch driving data-theme on <html>.
 * Persists the explicit choice (localStorage + cookie); clears it to follow
 * prefers-color-scheme. `tone` adapts to the brand header vs a light surface.
 */
export function ThemeToggle({ tone = "surface" }: { tone?: Tone }) {
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
      setDocumentTheme(getSystemPreference());
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
        setDocumentTheme(event.matches ? "dark" : "light");
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
      root.classList.toggle("dark", system === "dark");
      root.dataset.theme = system;
      clearStoredTheme();
      setTheme("system");
    }
    setIsMounted(true);
  }, [setDocumentTheme, clearStoredTheme]);

  const isDark = isMounted && (theme === "system" ? getSystemPreference() : theme) === "dark";
  const switchLabel = isDark ? t("toLight") : t("toDark");

  const handleToggle = () => {
    if (!isMounted) return;
    const active = theme === "system" ? getSystemPreference() : theme;
    setTheme(active === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isDark}
      aria-label={t("toggleAria")}
      title={switchLabel}
      data-ui="theme-toggle"
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-[var(--radius-full)] border transition-colors",
        tone === "brand"
          ? "border-[var(--color-text-on-brand)] bg-transparent"
          : "border-[var(--color-border-default)] bg-[var(--color-bg-surface)]",
      )}
    >
      <span className="sr-only">{switchLabel}</span>
      <span
        aria-hidden
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius-full)] transition-transform",
          isDark ? "translate-x-[22px]" : "translate-x-[3px]",
          tone === "brand"
            ? "bg-[var(--color-text-on-brand)] text-[var(--color-bg-header)]"
            : "bg-[var(--color-action-primary)] text-[var(--color-text-on-action)]",
        )}
      >
        {isDark ? <Moon size={12} /> : <Sun size={12} />}
      </span>
    </button>
  );
}
