# Autonomous gap-build progress log

Running log for the unattended A→K gap build (PLAN D-12 operator authority). One section per task: status, commit SHA, decisions, flags. Re-read at the start of each task — context may truncate.

**Stack base:** `feat/K-html-lang` @ e880efb (A→K linear, unmerged; main @ 11a5f02). Each task branches off the previous tip; DO NOT merge to main.

**Verification policy (deviation noted up-front):** `pnpm typecheck` runs every task (fast). `pnpm lint` + `pnpm build` before each commit. Full `pnpm test:e2e` requires a production build + `pnpm start` server (35 spec files) — too slow to run in full per task, so I run the **new/affected** spec file(s) against a built server and rely on typecheck+build+lint for the rest. Flagged per task where reduced.

**Folders convention:** Media folders are a fixed code-defined set (`lib/media/folders.ts`) mapped to content areas (general/news/galleries/documents/team/partners), matching Figma 89:2 — not a separate DB model.

---

## Task 1 — G2-1 Media Library (Figma 89:2) — ✅ DONE

Branch: `feat/G2-1-media-library` (off e880efb). Commit: _(see git log)_.
Verification: typecheck ✓, lint ✓ (0 errors), build ✓, e2e media-library.spec ✓ (2/2).

Plan:
- Additive schema: `Media` model (url, pathname, filename, alt?, folder, mimeType, size, width?, height?, isMinorPhoto, consentRecordedAt?, authorId). Migration + seed rows.
- `lib/media/folders.ts` (fixed folder set) + `lib/media.ts` (reads w/ explicit select).
- Server Actions `app/admin/media/actions.ts`: uploadMedia / updateMediaMeta / deleteMedia (Vercel Blob `put`/`del`, AuditLog, revalidate).
- UI: `app/admin/media/page.tsx` + `_components/MediaLibraryClient` (3-pane: folders rail / dropzone+grid / details), `MediaPicker` (reusable modal), `MediaField` (form field).
- Wire MediaField into ContentForm `image` field; add Media nav link; i18n bg/en; Playwright test.

Decisions:
- Upload via Server Action (FormData) per §2 "new admin mutations use Server Actions" — no new REST route.
- `alt` nullable in DB; UI surfaces required-alt warning badge (matches Figma ALT ✓ / ⚠ липсва). Enforcement-on-use is advisory at the library level.
