/**
 * Format a date as relative time, localized via Intl.RelativeTimeFormat
 * (e.g. "преди 2 часа" / "2 hours ago"). Admin defaults to Bulgarian.
 */
export function formatDistanceToNow(date: Date, locale = "bg"): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return locale.startsWith("bg") ? "току-що" : "just now";
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffHour < 24) return rtf.format(-diffHour, "hour");
  if (diffDay < 7) return rtf.format(-diffDay, "day");
  if (diffWeek < 4) return rtf.format(-diffWeek, "week");
  if (diffMonth < 12) return rtf.format(-diffMonth, "month");

  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

/** Format a date as a readable string (localized; admin defaults to Bulgarian). */
export function formatDate(date: Date, locale = "bg"): string {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

/** Format a date with time (localized; admin defaults to Bulgarian). */
export function formatDateTime(date: Date, locale = "bg"): string {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
