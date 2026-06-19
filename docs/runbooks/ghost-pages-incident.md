# Incident: ghost `${slug}-${locale}` pages (2026-06-17)

## What happened
14 duplicate "ghost" root pages existed in the dev DB — one `${slug}-bg` (locale
`bg`) and one `${slug}-en` (locale `en`) for each of the 7 nav roots (novini,
priem, obuchenie, uchilishteto, uchenicheski-zhivot, blog, evroproekti), with the
**labels swapped** (the `bg` row held the English title e.g. "News", the `en` row
held the Bulgarian title e.g. "Новини"). They inflated both public headers to 14
roots until their `navLabel` was nulled, and then were purged.

## Purge
`pnpm purge:ghosts` (`scripts/purge-ghost-pages.ts`): capture-first dump to
`scripts/.cache/ghost-pages-<ts>.json`, then delete by the **exact 14 ids** in a
transaction with an `== 14` assertion (+ a `-(bg|en)$` slug-shape guard). Result:
14 pages deleted, 0 PageVersions, both headers back to 7. Recoverable from the dump.

## Root cause (best evidence — NOT reproducible from current code)
The 14 rows share a signature that excludes every current write path:
- **0 PageVersions** → not the admin API (`POST /api/admin/pages` snapshots a
  version on create); created by a raw `prisma.page.create`.
- **`machineTranslated = false`** → not `backfill-en` nor `translatePageToEn`
  (both set `machineTranslated = true`, and both reuse the *same* slug at the
  other locale — never a `-bg`/`-en` suffix; `POST` returns **409** on collision,
  it never auto-suffixes).
- Seed-admin `authorId`, 14 distinct own `groupId`s, one 12:45:59 burst.

A repo-wide grep finds **no** code constructing `${slug}-${locale}` page slugs
(the only `-${n}` suffixing is for image filenames). Conclusion: a one-off /
older or ad-hoc `create` script (iterating the seed `navRoots` with a locale
suffix and the wrong-locale label) — gone from the codebase. Not reproducible by
any current flow.

## Proposed guard (follow-up — not implemented here)
A slug should never carry its own locale (locale is a column). Add a near
one-line invariant on the page create/update paths and/or seed:

```ts
// app/api/admin/pages/route.ts (and importer/seed)
if (/-(bg|en)$/.test(slug)) return NextResponse.json(
  { error: "Slug must not end with a locale suffix (-bg/-en)" }, { status: 400 });
```

This rejects the exact shape of the incident class at the source. Tracked as a
follow-up; the create flow itself was not modified in `chore/purge-ghosts`.
