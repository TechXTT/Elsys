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

---

## Task 2 — G2-2 Content-type framework (Figma 92:2 + 94:2) — ✅ DONE

Branch: `feat/G2-2-content-framework` (off Task 1 tip a002727).
Verification: typecheck ✓, lint ✓ (0 errors), build ✓, e2e club-admin + carousel-admin + media-library ✓ (6/6).

What landed:
- Additive schema: generic `SuccessorNote` model keyed by `(entity, entityId)` (migration `20260616212327_add_successor_note`) — successor notes work across every type with no per-model column.
- `lib/content/shared.ts`: new `colortag` field type; config options `titleField/slugPrefix/colorField/statusField/imageFolder/enableSuccessorNote/enableBulk`; shared `COLOR_TAG_OPTIONS` + `STATUS_OPTIONS`.
- `lib/content/successor-notes.ts`: get/persist helpers.
- Actions: create/update now persist the successor note (`__successorNote` field); new `bulkSetStatus` + `bulkDeleteRecords` (AuditLog + revalidate).
- Form rewritten to 94:2 — two-column with publish aside (status select, publishAt, Save&Publish / Save draft, delete, autosave indicator), `ColorTagPicker`, MediaField image fields, amber successor-note box, slug prefix adornment, localStorage autosave + "saved Ns ago" indicator.
- List rewritten to 92:2 — `ContentListClient` with select-all + bulk action bar (publish/archive/delete + clear), ColorTag dot badge + status badge columns. Removed old `ContentListTable`.
- `club.ts` migrated to the new config (colortag, slug prefix, colorField, imageFolder). Carousel inherits aside + autosave automatically.
- `docs/patterns/new-content-type.md` written (the cookie-cutter for tasks 3–9).
- i18n: `Admin.contentForm.*` + `Admin.contentList.*` (bg/en, ICU params).

Decisions:
- Successor note as a generic model (not per-model column) — reusable, matches the M5.2 "notes for successors" constraint broadly; bulk-delete cascades the notes.
- ColorTag picker shows all 10 enum values but collapses to the 6 design-system tag hues (title/aria-label disambiguates) — stays on-token, no invented colors. Flagged as the same lossy mapping already noted in `components/ui/Badge.tsx`.
- Server-draft autosave + crash recovery deferred to G3-2 (this task ships the localStorage draft + indicator only, per the brief's "autosave indicator").

---

## Tasks 3–9 — content types (cookie-cutter per docs/patterns/new-content-type.md)

Note: full `pnpm test:e2e` runs in ~25s (63 specs) — fast enough to run the **whole** suite per task from here on (supersedes the reduced-scope note above).

### Task 3 — Document — ✅ DONE
Branch `feat/G2-3-document` (off Task 2 tip de8b7b4). typecheck ✓ lint ✓ build ✓ e2e ✓ (63/63).
- Additive `Document` model + migration `20260616214519_add_document` + 4 seed rows (incl. a hidden DRAFT).
- `document` content type registered (slugPrefix `/dokumenti/`, colorField, fileUrl/fileType/fileSize/category fields).
- `lib/documents.ts`: cached public read (memory→Redis→DB, explicit select, `publicWhere()`), `revalidateDocuments()`.
- Public `/[locale]/dokumenti` route — real data, grouped by category, drafts hidden; `Documents` i18n ns.
- `DocumentList` block bound to data via `BlockContext.documents` (inline items kept as fallback); `compile.tsx` prefetches documents in a `Promise.all` when the block is present (precursor to the G2-3 `needs:` mechanism).
- Framework gap fixed: generic content actions now call `revalidatePublicForType()` (server-only map) → public cache bump + route revalidation on every mutation (working-agreement #3).
- Test `tests/e2e/documents.spec.ts`.

### Task 4 — Gallery (GalleryItem) — ✅ DONE
Branch `feat/G2-4-gallery` (off Task 3 tip 2e7daea). typecheck ✓ lint ✓ build ✓ e2e gallery ✓ (3/3).
- Additive `GalleryItem` model + migration `20260616215859_add_gallery_item` + 6 seed rows (1 hidden draft).
- `gallery` type registered (album select, image MediaField, colorField).
- `lib/gallery.ts` cached read; `/[locale]/galeria` rewritten to real data + album filter chips (i18n labels kept).
- `GalleryLightbox` client: grid → accessible dialog with keyboard (Esc/←/→) nav; drafts hidden.
- revalidate map extended (`gallery`). i18n Gallery.empty + lightbox labels.

### Task 5 — Club (public surface) — ✅ DONE
Branch `feat/G2-5-club-public` (off Task 4 tip f8b5b47). typecheck ✓ lint ✓ build ✓ e2e ✓.
- Club model + framework CRUD already existed (promoted in Task 2). Added the missing public surface:
- `lib/clubs.ts` cached read; public `/[locale]/klubove` route (ClubCard grid, drafts hidden).
- `ClubGrid` block bound to `BlockContext.clubs` (inline fallback kept); `compile.tsx` prefetches clubs.
- revalidate map extended (`club`). `tests/e2e/clubs-public.spec.ts`.

### Task 6 — TeamMember (+category) — ✅ DONE
Branch `feat/G2-6-team` (off Task 5 tip 13fe95e). typecheck ✓ lint ✓ build ✓ e2e team ✓ (2/2).
- Additive `TeamMember` model + migration `20260616221511_add_team_member` + 4 seed rows (1 draft).
- `team` type (titleField "name", role/category/email/photo). `lib/team.ts` cached read.
- Public `/[locale]/ekip` grouped by category, drafts hidden. `Team` i18n ns.
- `TeamGrid` block bound to `BlockContext.team`; compile.tsx prefetch; revalidate map (`team`). `tests/e2e/team.spec.ts`.

### Task 7 — Partner (+category) — ✅ DONE
Branch `feat/G2-7-partner` (off Task 6 tip 29bcbb6). typecheck ✓ lint ✓ build ✓ e2e partners ✓ (2/2).
- Additive `Partner` model + migration `20260616222437_add_partner` + 4 seed rows (1 draft). `partner` type, `lib/partners.ts`.
- Public `/[locale]/partnyori` strip (PartnerLogo, grayscale), drafts hidden. `Partners` i18n.
- `PartnerGrid` block bound to `BlockContext.partners`; compile.tsx prefetch; revalidate map (`partner`). `tests/e2e/partners.spec.ts`.

### Task 8 — Project — ✅ DONE
Branch `feat/G2-8-project` (off Task 7 tip f83527d). typecheck ✓ lint ✓ build ✓ e2e projects ✓ (2/2).
- Additive `Project` model + migration `20260616223448_add_project` + 3 seed rows (1 draft). `project` type, `lib/projects.ts`.
- Public `/[locale]/proekti` list with a **functional** card on design tokens — dedicated ProjectCard is design-pending (gap backlog), flagged. Drafts hidden. `Projects` i18n.
- No block (no ProjectList in registry; not required by brief — design-pending). revalidate map (`project`). `tests/e2e/projects.spec.ts`.
- FLAG: existing nav key `projects` points at `/evroproekti`; the new data list is at `/proekti`. Aligning nav is out of scope (one-change rule) — operator decision whether to repoint nav or alias.

### Task 9 — Award + Leader (yearly-append, D-10) — ✅ DONE
Branch `feat/G2-9-award-leader` (off Task 8 tip ab9e2dc). typecheck ✓ lint ✓ build ✓ **full e2e 76/76** ✓.
- Additive `Award` + `Leader` models (each with `year` Int) + migration `20260616224314_add_award_leader` + seed (6 rows, 2 drafts).
- `award` + `leader` types (year required). `lib/awards.ts` + `lib/leaders.ts` cached reads ordered by year desc.
- Public `/[locale]/nagradi` (awards grouped by year) + `/[locale]/vipuski` (alumni grouped by class year), drafts hidden. `Awards` + `Leaders` i18n.
- Functional token cards; dedicated AwardItem/LeaderCard design-pending (flagged). revalidate map (`award`, `leader`).
- **Content-type set complete** (Document, Gallery, Club, TeamMember, Partner, Project, Award, Leader). `tests/e2e/awards-leaders.spec.ts`.
