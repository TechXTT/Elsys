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

---

## Task 10 — G2-3 Block system R4 — ✅ DONE
Branch `feat/G2-10-block-r4` (off Task 9 tip 696ad41). typecheck ✓ lint ✓ build ✓ e2e ✓ (two-factor reseed note below).
- `BlockDefinition` gains `schema?: z.ZodTypeAny` + `needs?: DataNeed[]`. Hand-rolled validators (Hero/Section/NewsList) replaced by Zod schemas; required fields (Hero.heading, Section.title, Embed.url) enforced via Zod. Every registry entry now has a schema (permissive `passthrough()` default auto-filled for presentational blocks).
- `validateBlocks` + `renderBlocks` are schema-driven (safeParse → normalized props; invalid blocks skipped, page survives).
- `collectBlockNeeds(blocks)` + `lib/cms/block-data.ts#loadBlockData(needs, locale)` — declared data deps (news/documents/clubs/team/partners/carousel) prefetched in **one Promise.all** via the cached lib readers. Both renderers use it: `compile.tsx` (home + CMS pages) and `[...slug]/page.tsx` (replaced its news-only fetch → now all data-bound blocks work on subpages too, incl. CarouselHero which previously got no slides off the home page).
- Removed the five per-type `requiresX` helpers in compile.tsx.
- No "not-implemented placeholder" blocks existed to remove (every registry type renders; Tabs/Embed degrade gracefully, not placeholders) — verified.
- NOTE: a full-suite run showed 2 `two-factor` failures from **seed-state drift** (single-use recovery codes consumed + enroll toggled by repeated local runs) — unrelated to R4; both pass after `pnpm prisma:seed` (5/5). Re-seed before a clean full-suite run.

---

## Task 11 — G2-4 News parity — ✅ DONE
Branch `feat/G2-11-news-parity` (off Task 10 tip ecb9950). typecheck ✓ lint ✓ build ✓ e2e news ✓ (5/5).
- **Decision (taxonomy, PLAN M2.4 + D-12 default):** category becomes a relation to a parent **Page** (Sweboo parity) — *additive, non-destructive*: free-text `category` + `colorTag` are kept as fallback rather than dropped. NewsPost gains `categoryPageId` + `categoryPage` relation (`onDelete: SetNull`); Page gains `categorizedNews` back-relation; index on `categoryPageId`. Migration `20260616231200_add_news_category_page`.
- `lib/news.ts`: all selects fetch the linked page title; effective `category` = `categoryPage.title ?? category`. New `getNewsCategoryPages(locale)` helper (id+title) for the Task-12 editor picker.
- **Verified existing:** `getRelatedNews` (related posts) + `colorTag` chip both present (E1/E2) — unchanged.
- Seed: a category Page "Събития" + a post linked to it; `tests/e2e/news-category.spec.ts` extended to assert the page-derived chip + filter.
- The category-page **picker UI** lands in Task 12 (Simple Mode editor) per the brief; the REST news editor still sets free-text category (deprecated path, untouched).

---

## Task 12 — G3-1 Editor Simple Mode (Figma 95:2) — ✅ DONE
Branch `feat/G3-1-simple-editor` (off Task 11 tip 6fd78ad). typecheck ✓ lint ✓ build ✓ e2e news-simple-editor ✓ (2/2).
- New **Simple Mode** one-screen editor at `/admin/news/simple` (+ `/[id]` edit), matching 95:2: title (required), excerpt, body (curated toolbar), gallery (MediaPicker add/remove), aside = category (parent-Page select from `getNewsCategoryPages`), date, featured image (MediaField), ColorTag picker, Publish / Save draft; Опростен/Разширен toggle (Разширен → existing `/admin/news` block builder); autosave indicator (localStorage).
- Save via **Server Action** `saveSimpleNews` (no REST) — create/update through `createNewsPost`/`updateNewsPost` + a follow-up update for `colorTag` + `categoryPageId`; AuditLog + `revalidateNews`. Slug auto-derived from title (`lib/slug.ts`, Cyrillic-preserving, uniqueness-checked).
- Entry point added on `/admin/news` header ("+ Опростен редактор"). i18n `Admin.simpleEditor.*`.
- **FLAG (TipTap):** §2 locks TipTap, but it is not installed and the news body is stored/rendered as **markdown** end-to-end. Simple Mode reuses the existing `RichTextEditor` (curated toolbar over markdown) to avoid a storage+render migration mid-run. Swapping to TipTap is a dedicated PR (add deps, choose HTML/JSON storage, update the public ReactMarkdown renderer) — flagged, not done.
- **FLAG (TEACHER default):** "TEACHER lands here" needs the TEACHER role, added in Task 15 (G5-1). For now Simple Mode is reachable by any admin via the toggle/entry; Task 15 wires role-based default + restricts Advanced.

---

## Task 13 — G3-2 Editor UX — ✅ DONE
Branch `feat/G3-2-editor-ux` (off Task 12 tip 1abf866). typecheck ✓ lint ✓ build ✓ e2e editor-ux ✓ (1/1).
- **Autosave + crash recovery** in the Simple editor: localStorage every 5s (instant) **and** server draft every 30s (cross-device) via a generic `Draft` model (`(userId, key)`) + `app/admin/drafts/actions.ts` (save/load/clear). On mount a recovery banner offers to restore the newer draft (localStorage preferred, server fallback); restore remounts the form (formKey + draft-aware defaults) so uncontrolled inputs + internal-state pickers re-init; drafts cleared on successful save. Migration `20260617002810_add_draft`.
- **Image cropper** (`ImageCropper.tsx`) — **DESIGN-PENDING, built functional + flagged**: center cover-crop at a chosen aspect (16:9/4:3/1:1/original) → canvas → re-upload via `uploadMedia` → returns the new URL; wired into `MediaField` (Crop button on a selected image). Full drag-resize crop box + remote-host CORS hardening are follow-ups.
- **Already shipped, verified:** required titles (Zod + `required`), native date/datetime pickers ("real" pickers), bulk ops (Task 2 `ContentListClient`). Note: news date is date-only (Sweboo parity); content `publishAt` is datetime-local.
- Test `tests/e2e/editor-ux.spec.ts` (localStorage recovery path; 30s server path exercised by the action unit-style).

---

## Task 14 — SEO residue (R2) — ✅ DONE
Branch `feat/G2-14-seo` (off Task 13 tip 1cbb850). typecheck ✓ lint ✓ build ✓ e2e seo ✓ (3/3).
- Additive SEO fields on **Page + NewsPost**: `metaTitle, metaDescription, ogImage, noindex, canonical`. Migration `20260617004206_add_seo_fields`.
- `lib/site.ts`: `ogImageUrl()` + `applySeo(base, seo, {title, description, fallbackImage})` — merges overrides (title/description/robots noindex/canonical/OG image, with a generated `/og` card fallback).
- Wired into `generateMetadata` for the **news article** (`/novini/[slug]`) and **dynamic pages** (`[...slug]`).
- **OG-image route** `app/og/route.tsx` (next/og `ImageResponse`, edge, 1200×630 brand card). Added `og` to the middleware matcher exclusions (locale middleware was 404-ing it).
- **`/sitemap-news.xml`** route — published posts via `getNewsPosts` (→ `publicWhere({gateDate})`). Main `app/sitemap.ts` made async, now reads published news through `publicWhere` + includes the new content routes.
- **News SEO UI:** collapsible "SEO настройки" section in the Simple editor (metaTitle/metaDescription/ogImage MediaField/canonical/noindex); persisted by `saveSimpleNews`; loaded on edit; covered by autosave/recovery.
- **FLAG (Page SEO UI):** schema + metadata wiring done for Page, but surfacing the SEO panel in the **Page editor** (the PageBuilder) is a separate UI effort — deferred; news gets the full UI now.
- Test `tests/e2e/seo.spec.ts`.

---

## Task 15 — G5-1 Roles (PLAN M5.1) — ✅ DONE  ⚠️ SECURITY-REVIEW REQUIRED
Branch `feat/G5-1-roles` (off Task 14 tip f9e0734). typecheck ✓ lint ✓ build ✓ e2e roles ✓ (2/2); full suite green except the pre-existing 2FA shared-account parallel flake (passes 5/5 in isolation — see Task 10 note).
- Additive Role enum values: `TEACHER, STUDENT_EDITOR, STUDENT_ADMIN` (USER + ADMIN kept). Migration `20260617010032_add_roles`.
- `lib/auth/permissions.ts` — client-safe permission matrix (`ROLE_PERMISSIONS`, `can`, `defaultEditorMode`). `lib/auth/guard.ts` (server) — `requirePermission` / `requireUserId` / `currentRole`.
- **Enforced in Server Actions:** content create/update/delete/bulk → `content:edit`; media upload/update/delete → `media:edit`; news Simple save → `news:edit`; role assignment → `roles:manage`.
- **Users & roles admin UI** `/admin/roles` (ADMIN-gated): read-only permission matrix (role × permission) + per-user role-assignment table; `setUserRole` Server Action writes **AuditLog** (`USER_ROLE_CHANGE`) and guards against self-demotion lockout. Sidebar link + i18n.
- TEACHER now lands in Simple Mode (`/admin/news` redirects TEACHER → `/admin/news/simple`), closing the Task-12 flag.
- Seed: a `teacher@elsys.bg` (TEACHER, password `teacher123`) for the roles UI + TEACHER routing.

### ⚠️ SECURITY-REVIEW FLAGS (for the human)
1. **2FA scope:** mandatory 2FA is still ADMIN-only. STUDENT_ADMIN has near-admin capabilities (users:manage, nav, content) — decide whether STUDENT_ADMIN (and/or TEACHER) must also enrol 2FA.
2. **Matrix authority:** `ROLE_PERMISSIONS` in `lib/auth/permissions.ts` is the single source of truth — review the exact grants (esp. STUDENT_ADMIN getting `users:manage` but NOT `roles:manage`).
3. **Enforcement coverage:** Server Actions are gated, but the **deprecated REST routes** under `app/api/admin/**` were NOT re-gated with the new matrix (they predate it and still use their own ADMIN checks). Audit them before relying on roles for REST.
4. **Self-demotion guard** only blocks the acting admin removing their own ADMIN role; it does not prevent the *last* admin being demoted by another admin — add a "≥1 ADMIN" invariant if desired.
5. Role changes are audited; consider alerting on `USER_ROLE_CHANGE` in the audit review.

---

## STOP — end of Tasks 1–15. Remainder (G3-3, G5-2/5.3, G5-4) needs human/design/legal per the brief.

---

# Phase G4 — migration scraper/seeder (operator-queued, PLAN M4.1/4.2)

Branched off Task-15 tip `76b4f82`. DEV-DB only, read-only/throttled/cached scrape; imported content = DRAFT, never auto-published; consent never auto-asserted. New deps: **none** (cheerio + node-fetch already present; p-limit avoided via a tiny inline limiter).

## G4-1 — crawler — ✅ DONE
Branch `feat/G4-1-crawler`. typecheck ✓ (crawler runs cache-only; classify unit-checked).
- `scripts/import/LEGACY-MAP.md` — audited live URL patterns: news `/novini-i-sybitija/novini/<slug>-<id>`, blog `/blog/<slug>-<id>`, 2-level page tree (`/obuchenie|priem|uchenicheski-jivot/<page>`), item lists `…/<section>/<slug>-<id>`; trailing `-<id>` = `legacyId`. robots.txt disallows only `/admin/`; no sitemap.
- `scripts/import/lib/http.ts` — cached (`.cache/`, gitignored) + throttled (≤1 req/s) + robots-aware fetch (`fetchPage`/`fetchBinary`), `cacheOnly` mode so `--dry-run` does zero live traffic; inline `pLimit`.
- `scripts/import/crawl.ts` — BFS from seeds, classifies every content URL (type + legacyId + slug) → `.cache/urls.json`. `--limit`, `--cache-only`. Verified cache-only run + classify.
- `package.json`: `import:crawl`, `import:all` (runner built in a later sub-phase).

## G4-2 — HTML→markdown/blocks converter — ✅ DONE
Branch `feat/G4-1-crawler` (stacked). `scripts/import/html-to-blocks.ts`: Sweboo TinyMCE → GFM markdown + collected images + warnings. Unit-checked.

## G4-3 — extractors (news/blog/page) — ✅ DONE
`scripts/import/extract.ts`: `.single-text > .text` (title `.page-title`) → NewsPost (news/blog; blog→"Блог"; featured=first image; date heuristics, null fallback) / Page (parentSlug from path). Verified on real cached pages.

## G4-4 — runner + dry-run report — ✅ DONE
`scripts/import/run.ts`: default **--dry-run** reads the cached inventory, extracts all, writes `.cache/import-report.json` (counts, news missing-date, media missing-alt + consent-review, HTML warnings, redirect coverage, unmapped). `--commit` **disabled** (gated) pending the write/media/redirect sub-phases. `scripts/import/README.md` + `docs/patterns/migration.md` document the fixture-seed vs real-import split.

### Live crawl performed (authorized: read-only, throttled ≤1 req/s, cached)
Crawled ~83 pages → **85 content URLs** (7 news, 12 blog, 11 item, 25 page, 30 other). Dry-run report:
- **84 extracted, 0 unmapped.** News **19** (7 news + 12 blog) — **all 19 missing a structured date** (Sweboo exposes no parseable publish date → needs a date source or editor entry; FLAGGED). Pages **65**.
- **Media: 44 referenced, 33 missing alt, 44 flagged for consent review** (consent never auto-asserted).
- HTML conversion warnings (low): wbr, picture/source, script, nav, link, br, stray `a` — all minor.
- **Redirect coverage 99%** (84 mapped, 1 uncached). News map `/novini-i-sybitija/novini/<slug>-<id>` → `/novini/<slug>`; pages keep their path.

### ⏳ Remaining G4 sub-phases (NOT built — flagged; commit path is gated)
1. Additive `legacyId`/`legacyUrl` on NewsPost + Page; DB upsert path (DRAFT, idempotent by legacyId).
2. Media pipeline: download → dedupe-by-hash → Blob → Media rows (carry alt, flag missing-alt + minors' consent).
3. `RouteRedirect` model + migration + 404 consumption (R1) + full legacy-URL backfill (incl. dropped-type targets per §2).
4. Specialized extractors for Document/Club/Team/Partner/Gallery/Project/Award/Leader (currently these legacy pages route to Page/DRAFT for editor reclassification).
5. M4.4 visual-diff harness — **HARD STOP** per brief (operator will brief separately).

**STOP per brief:** dry-run done + reported; **no `--commit`/non-dry run, no prod, no auto-publish.** Awaiting operator review of the report before proceeding.

---

# Post-review continuation (operator approved dry-run) — Parts A/B/C

## Part A — security hardening — ✅ DONE
Branch `feat/G5-sec-hardening` (off G4-4 tip 95ad1ff). typecheck ✓ lint ✓ build ✓ e2e roles 3/3 + two-factor 5/5.
- **2FA scope:** middleware mandatory-2FA gate now covers **ADMIN + STUDENT_ADMIN** (both bounced to `/admin/security` until enrolled); TEACHER/STUDENT_EDITOR ungated.
- **All admin API routes gated:** new `lib/auth/api-guard.ts` (`apiGuard(permission)`); applied to every `app/api/admin/**` handler via the matrix (news→news:edit, pages→pages:edit, navigation→nav:edit, users/reset-password→users:manage, admins/register→roles:manage/ADMIN-only, dashboard→audit:view, me→auth-only). **`2fa/precheck` intentionally ungated** (pre-login, no session) — it broke login when gated; reverted + commented.
- **Last-admin invariant:** `wouldRemoveLastAdmin()` in `lib/auth/guard.ts` blocks demoting/deleting the final ADMIN (friendly BG `LAST_ADMIN_ERROR`) in `setUserRole` + admins/[id] PATCH/DELETE + users/[id] PATCH/DELETE, each AuditLogging the blocked attempt (`*_BLOCKED`). e2e covers the bootstrap-admin demotion guard.
- Clears Task-15 security-review flags #1 (2FA scope), #3 (ungated REST), #4 (last-admin). Flag #2 (matrix grants) is a human policy review, unchanged.

## Part B — design reconcile + cleanup — ✅ DONE
Branch `feat/G2-design-reconcile` (off Part A tip 1fc8987). typecheck ✓ lint ✓ build ✓ e2e projects + awards-leaders 6/6.
- **Cards → real components matched to Figma:** `components/project-card.tsx` (112:2 — cover image + Badge category + title + description, card-as-link), `components/award-item.tsx` (112:12 — title/subtitle + amber trophy), `components/leader-card.tsx` (112:19 — initials/photo avatar + name + coral "Випуск {year}" + role). Wired into `/evroproekti`, `/nagradi`, `/vipuski`; removed the inline "design-pending" markup.
- **Image cropper → 111:2:** rule-of-thirds grid overlay + framed crop region with corner handles, a "Мащаб" zoom slider (tightens the centered crop + previews via transform), chips 16:9/4:3/1:1/Свободно, buttons Отказ/Приложи. Token-bound.
- **Page-editor SEO panel (94:2 field pattern):** added an SEO card in the page editor's Settings tab (metaTitle/metaDescription/ogImage/canonical/noindex), wired through the pages REST API (POST/PUT accept + persist; GET already returns them) + `hasChanges`. `Admin.seo.*` i18n. Clears the Task-14 Page-SEO-UI flag.
- **/evroproekti canonical:** renamed `app/[locale]/proekti` → `evroproekti`; **308** `/:locale/proekti(/*)` → `/evroproekti` in next.config; repointed project slugPrefix, sitemap, revalidate, metadata; nav already pointed there. e2e asserts the redirect. Grep confirms no stray `/proekti`.

## Part C — G4 full commit path — ✅ DONE
Branch `feat/G4-2-import-commit` (off Part B tip 36667be). typecheck ✓ lint ✓ build ✓ **full e2e 87/87** (with imported DRAFT content + redirects present — fixture seed untouched).
- **Schema (additive):** `legacyId`/`legacyUrl` on NewsPost + Page; `legacyUrl` on the 8 typed models (legacyId existed); new **`RouteRedirect`** model. Migration `20260617030400_add_legacy_fields_and_redirects`.
- **Commit path** (`scripts/import/importer.ts`, `run.ts --commit`): idempotent upsert News/Blog → NewsPost and the page tree → Page, **DRAFT** (never auto-published), keyed by natural slug, carrying legacyId/legacyUrl. DEV-DB guard refuses prod-looking URLs.
- **Media pipeline** (`media.ts`): download → dedupe by content hash → Blob → Media row; carries legacy alt (flags missing); markdown rewritten to Blob URLs. **Consent never auto-asserted** (isMinorPhoto=false, consentRecordedAt=null; all flagged).
- **News dates** (`news-dates.ts`): best-effort from the index `<time>` (5 recovered); missing → 1970 sentinel + "дата липсва" flag (never fabricated).
- **Redirects:** `lib/redirects.ts` + 404 consumption in `[...slug]` (R1) + backfill of every legacy URL → new canonical (+ dropped-type Calendar → /novini).
- **Specialized types:** Club/Team/Partner/Gallery/Project/Award/Leader are **not** distinct typed pages on the live site (the public site renders them as ordinary content pages), so they import as **Page/DRAFT** for editor reclassification — `extract.ts` dispatch is ready to add real extractors once a source layout is identified. Documented honestly in README.

### REAL DEV-DB import run (`pnpm import:all --commit`) — summary
- **84/85 extracted** (1 junk URL with spaces skipped). Committed **DRAFT**: **19 news + 65 pages**.
- **Media:** 44 referenced, **37 imported to Blob** (dedupe + a few unfetchable), 33 missing alt, **44 flagged for consent review**.
- **Redirects:** **85 persisted**, **99% coverage** (84 mapped + 1 dropped-type; 1 junk URL unmapped).
- **News dates:** 5 recovered from the index, **14 flagged "дата липсва"** (1970 sentinel, DRAFT).
- e2e stayed green (87/87) — imported DRAFT content is invisible to public tests; the fixture seed is unchanged.

---

# Final feature batch (operator-queued, stacked off G4 tip 975dcee)

## Task 1 — G3-3 inline <Editable> (Figma 110:3) — ✅ DONE
Branch `feat/G3-3-inline-edit`. typecheck ✓ lint ✓ build ✓ e2e 2/2.
- Admin-only inline block editing on public pages: `renderBlocks(..., edit)` wraps editable text blocks (Hero/Section/Markdown) with `components/admin/InlineEditableBlock.tsx` — dashed outline + "Редактирай" → right drawer (Заглавие/Съдържание) → `inlineUpdatePageBlock` Server Action (pages:edit gated, AuditLog, invalidate page cache + revalidate both locales). `[...slug]` passes `edit` only when `can(role,"pages:edit")`.
- Field mapping by type (Hero→heading/subheading, Section→title/markdown, Markdown→markdown). `Admin.inlineEdit.*` i18n. e2e: anon sees no affordance; admin edits + persists + reverts.

## Task 2 — G5-2 /admin/help (Figma 107:2) — ✅ DONE
Branch `feat/G5-2-help`. typecheck ✓ lint ✓ build ✓ e2e 2/2.
- `HelpArticle` model (additive, migration `20260617075720_add_help_article`) + 6 seeded runbooks as **DRAFT** (publish-a-news, change-academic-year, restore-deleted, season-handover, media-upload, manage-menu) — editable by the school via the content framework (`help` type registered, `enableSuccessorNote:false`).
- `/admin/help` help-center (tour launcher banner + runbook card grid) + `/admin/help/[slug]` markdown article view with an "Edit" link to the framework editor + DRAFT note. `lib/help.ts` reads. Sidebar "Помощ" link; `Admin.help.*` i18n (Bulgarian).
- Onboarding-tour **launcher** ships (links to the first runbook); interactive coachmarks flagged as a follow-up per brief.

## Task 3 — G5-3 /admin/handover (Figma 108:2) — ✅ DONE
Branch `feat/G5-3-handover`. typecheck ✓ lint ✓ build ✓ e2e 2/2.
- ADMIN-only (`roles:manage`) succession checklist wired to **real state** (`lib/handover.ts`): add admin (admin-capable count), assign role, enforce 2FA (all admins enrolled?), review successor notes (count), export audit log, deactivate leavers, season summary — each step's done/pending derived from the DB, with action links.
- Aside: successor select (admin-capable users), note + season-summary fields, a 2FA warning, and **Завърши предаването** → `completeHandover` Server Action that **AuditLogs** `HANDOVER_COMPLETE` (season, progress, note, summary). New `/api/admin/audit/export` JSON download (audit:view) for the season archive. Sidebar "Предаване" link (ADMIN). `Admin.handover.*` i18n.

## Task 4 — G5-4 GDPR consent + retention (Figma 106:2/106:13) — ✅ DONE
Branch `feat/G5-4-gdpr`. typecheck ✓ lint ✓ build ✓ e2e 2/2. New dep: **@vercel/analytics** (the §2 locked analytics choice, previously missing) — flagged.
- `CookieConsent` (banner + preferences modal): necessary always-on, analytics opt-in; choice persisted to a first-party `cookie-consent` cookie (`lib/consent.ts`) + live `consentchange` event. Reopen from the footer ("Бисквитки").
- `ConsentedAnalytics` mounts Vercel `<Analytics/>` **only** when analytics consent is granted (reacts live). Both mounted in the locale layout.
- **IP minimization:** `lib/ip.ts#anonymizeIp` (zero IPv4 host octet / truncate IPv6) applied to the **audit log** ip; contact-form **rate-limit key** now a one-way SHA-256 hash of the IP. Raw IP never written down.
- **Contact form** stays email-only (no PII at rest) — documented in `docs/gdpr-retention.md` (retention posture, templated for the DPO). `Consent.*` i18n.
