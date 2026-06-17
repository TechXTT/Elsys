// Cookie-consent state (G5-4 / GDPR). Client-safe. Necessary cookies are always
// on (session, locale, theme, Turnstile); analytics is opt-in. Persisted to a
// first-party cookie (readable client + server) + a window event for live updates.

export interface ConsentChoice {
  necessary: true;
  analytics: boolean;
  ts: number;
}

export const CONSENT_COOKIE = "cookie-consent";
export const CONSENT_EVENT = "consentchange";

export function parseConsent(raw: string | undefined | null): ConsentChoice | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    if (typeof v?.analytics === "boolean") return { necessary: true, analytics: v.analytics, ts: v.ts ?? 0 };
  } catch { /* ignore */ }
  return null;
}

export function readConsent(): ConsentChoice | null {
  if (typeof document === "undefined") return null;
  const row = document.cookie.split("; ").find((r) => r.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(row?.split("=").slice(1).join("="));
}

export function writeConsent(analytics: boolean): ConsentChoice {
  const choice: ConsentChoice = { necessary: true, analytics, ts: Date.now() };
  const value = encodeURIComponent(JSON.stringify(choice));
  // 12 months, lax, path=/. Not HttpOnly so the client can read it for live gating.
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
  return choice;
}
