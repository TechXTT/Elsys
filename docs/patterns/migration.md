# Migration pattern (legacy elsys-bg.org → new CMS)

Two distinct seeding paths — keep them separate:

| Path | Command | Source | Network? | Use |
|---|---|---|---|---|
| **Fixture seed** | `pnpm prisma:seed` (`prisma/seed.js`) | hardcoded fixtures | **No** | tests/CI/dev — deterministic, e2e depend on it |
| **Real import** | `pnpm import:crawl` + `pnpm import:all` (`scripts/import/`) | live legacy site (cached) | crawl only | one-time content migration into the dev DB |

`pnpm prisma:seed` must never reach the network so the e2e suite stays hermetic.
The import scripts are the only thing that touches the live site, and only via a
throttled, cached, read-only crawl (`scripts/import/lib/http.ts`).

## Rules (PLAN M4 + brief)
- **DEV DB only.** Never run the import against production.
- Imported content = **DRAFT** (never auto-published); EN goes through the
  existing DeepL needs-review path.
- **Consent is a legal judgment** — `consentRecordedAt` stays null for minors'
  photos and every imported person photo is flagged for human review.
- Idempotent: upsert by `legacyId`; every record keeps `legacyId` + `legacyUrl`.
- Every legacy URL gets a `RouteRedirect` (when that sub-phase lands) so old
  links resolve on 404 (R1); dropped types redirect to sensible targets (§2).

## Dry-run report (`scripts/import/.cache/import-report.json`)
Counts per type, news missing-date list, media missing-alt + consent-review
counts, HTML-conversion warnings, redirect coverage %, and unmapped URLs.
**Review this before any `--commit`.** See `scripts/import/README.md` for status.
