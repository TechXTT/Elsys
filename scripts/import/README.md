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

## Status (what's built vs. pending)
- ✅ Crawler, HTML→markdown converter, news/blog/page extractors, dry-run + report.
- ⏳ **Pending sub-phases (commit path):** DB upsert (DRAFT, by `legacyId`), media
  pipeline (download → dedupe-by-hash → Blob → Media rows, carry alt, flag
  missing-alt + minors' consent), `RouteRedirect` model + 404 consumption +
  backfill, specialized extractors for Document/Club/Team/Partner/Gallery/
  Project/Award/Leader (currently routed to **Page/DRAFT** for editor
  reclassification). `--commit` is intentionally disabled until these land and a
  human has reviewed the dry-run report.

## Seeder split
`pnpm prisma:seed` stays a **deterministic fixture seed** (used by tests/CI) and
must never depend on the network. The real import is these separate scripts.
See `docs/patterns/migration.md`.
