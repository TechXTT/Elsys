# GDPR — consent & retention posture (G5-4)

Templated for the DPO to finalize. Reflects what the system actually does.

## Consent (cookies)
- **Necessary** (always on, no consent needed): session (NextAuth), locale
  (`NEXT_LOCALE`), theme, Turnstile spam protection, and the consent cookie
  itself. The site does not function without these.
- **Analytics** (opt-in): Vercel Web Analytics — anonymous, no identity tracking.
  Gated by the consent choice via `components/ConsentedAnalytics.tsx`; the
  `<Analytics/>` script mounts **only** after the visitor grants the analytics
  category. Choice is stored in the first-party `cookie-consent` cookie (12 mo),
  re-openable from the footer ("Бисквитки").

## Contact form — email-only, no PII at rest
- Submissions are **emailed** (Resend) to the school and **not stored** in any
  database. There is no contact-message table. Retention of the email itself is
  governed by the school mailbox policy (out of scope for the app).
- Spam protection (Turnstile) and rate limiting are the only processing; neither
  persists message content.

## IP handling — minimized
- **Audit log:** stores an **anonymized** IP only (`lib/ip.ts` zeroes the IPv4
  host octet / truncates IPv6) — never the raw address.
- **Rate-limit keys:** the contact-form limiter keys on a **one-way SHA-256 hash**
  of the IP, never the raw IP at rest.
- The raw IP is used only transiently in-request (e.g. passed to Turnstile's
  verify call) and never written down.

## Retention summary
| Data | Stored? | Retention |
|---|---|---|
| Contact messages | No (emailed) | mailbox policy (school) |
| Audit log | Yes (anonymized IP) | review/purge policy — DPO to set (suggest ≤ 24 mo) |
| Rate-limit counters | Redis, hashed IP | auto-expire (window seconds) |
| Analytics | Vercel (anonymous) | Vercel default; opt-in only |

## To finalize (DPO)
- Confirm audit-log retention period + a purge job (not built).
- Confirm the Cookie Policy + Privacy Policy copy (templated legal pages:
  `/biskvitki`, `/poveritelnost`).
