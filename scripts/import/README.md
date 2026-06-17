# Legacy migration scraper (G4 / PLAN M4)

Read-only, throttled, cached importer of legacy `elsys-bg.org` (Sweboo) content
into the new CMS. **DEV DB only.** Imported content lands as **DRAFT** (never
auto-published); minors'-photo consent is never auto-asserted.

## Commands
```bash
pnpm import:crawl            # crawl the live site → .cache/urls.json (throttled, cached)
pnpm import:crawl --limit=50 # bounded crawl
pnpm import:all              # DRY-RUN (default): extract from cache → import report, NO writes
pnpm import:all --only=news  # dry-run a single type
pnpm import:all --limit=20   # dry-run first N
pnpm import:all --commit     # DISABLED in this build (see "Status" below)
```

The crawl caches every page under `scripts/import/.cache/` (gitignored), so the
dry-run and re-runs do **zero** live traffic. Re-crawl only to refresh.

## Pipeline
1. `crawl.ts` — BFS from seeds, classifies content URLs (type + legacyId + slug).
2. `extract.ts` — Sweboo `.single-text > .text` → normalized records (news/blog → NewsPost, pages → Page), keeping `legacyId` + `legacyUrl`.
3. `html-to-blocks.ts` — TinyMCE HTML → GFM markdown + referenced images + warnings.
4. `run.ts` — orchestrates the dry-run + writes `.cache/import-report.json`.

## Status (what's built)
- ✅ Crawler, HTML→markdown converter, news/blog/page extractors, dry-run + report.
- ✅ **Commit path (`--commit`):** idempotent upsert of News/Blog → NewsPost and
  the page tree → Page (DRAFT, never auto-published), keyed by natural slug +
  carrying `legacyId`/`legacyUrl`. Best-effort news dates from the index
  (`<time>`); missing → 1970 sentinel + "дата липсва" flag (never fabricated).
- ✅ **Media pipeline:** download → dedupe by content hash → Blob → Media row,
  carries legacy alt (flags missing); body markdown rewritten to Blob URLs.
  Consent is **never auto-asserted** (isMinorPhoto=false, consentRecordedAt=null,
  every image flagged for human review).
- ✅ **RouteRedirect:** model + 404 consumption in `[...slug]` (R1) + backfill of
  every legacy URL → new canonical (+ dropped-type targets, e.g. Calendar → /novini).
- **DEV-DB only:** `--commit` refuses a URL that looks like production.
- ⏳ **Not present on the live site as cleanly-typed pages** → routed to Page/DRAFT
  for editor reclassification: Club/Team/Partner/Gallery/Project/Award/Leader.
  The legacy public site exposes these as ordinary content pages, not uniform
  list pages, so specialized extractors would be guesswork. `extract.ts` dispatch
  is ready to add them once a real source layout is identified.

## Content-parity QA (M4.4)
```bash
pnpm import:parity   # cache-only; legacy cached HTML vs imported DB rows
```
Independently re-parses each cached legacy page (not the import pipeline, so it
catches content the importer dropped) and checks the imported row kept the key
headings + a representative paragraph, and that link counts are comparable.
Writes `.cache/parity-report.json` + a per-type summary. It's a **report**, not a
gate — review flagged rows. (Imported content is DRAFT/not public, so it compares
against the stored body the page renders from.)

## TODO — imported content is markdown, not blocks
Imported pages store their content in `Page.bodyMarkdown`, so the admin **block
builder canvas is empty** for them (it reads `Page.blocks`). If blocks should be
the source of truth for migrated pages, that's a separate **markdown→blocks
conversion** task (parse the imported markdown into the block schema). Until then,
imported pages are edited via the builder's **Content** tab (markdown), and the
public route renders the markdown. Not addressed in `fix/import-page-hierarchy`.

## Seeder split
`pnpm prisma:seed` stays a **deterministic fixture seed** (used by tests/CI) and
must never depend on the network. The real import is these separate scripts.
See `docs/patterns/migration.md`.
