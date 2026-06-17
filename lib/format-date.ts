import { type Locale } from "@/i18n/config";

/** Restrict to known-good BCP 47 tags; fall back to en-GB. */
function resolveDateLocale(locale: Locale): string {
  if (locale === "bg") return "bg-BG";
  return "en-GB";
}

/**
 * Format an ISO/date string for display in the active locale (short month).
 * Returns null for missing/invalid input so callers can omit the date line.
 * Shared by NewsCard / PostCard (Phase D).
 */
export function formatDateLabel(value: string | undefined, locale: Locale): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  try {
    return new Intl.DateTimeFormat(resolveDateLocale(locale), options).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat("en-GB", options).format(date);
    } catch {
      return new Intl.DateTimeFormat(undefined, options).format(date);
    }
  }
}
