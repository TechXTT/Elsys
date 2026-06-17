"use client";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { CONSENT_EVENT, readConsent, type ConsentChoice } from "@/lib/consent";

/**
 * GDPR-gated Vercel Web Analytics (G5-4): mounts <Analytics/> only after the
 * visitor has granted the analytics consent category. Reacts live to consent
 * changes (no reload needed).
 */
export function ConsentedAnalytics() {
  const [consent, setConsent] = useState<ConsentChoice | null>(null);
  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) => setConsent((e as CustomEvent<ConsentChoice>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!consent?.analytics) return null;
  return <Analytics />;
}
