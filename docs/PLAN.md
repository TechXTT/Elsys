# Elsys Rewrite — The Plan

Written 2026-06-11 by the operator after walking the live site, the live Sweboo admin, the rewrite's code, and its public pages. Supersedes all prior plans (deleted). Claude Code: your brief names the milestone and tasks; read that section only.

---

## 1. What this project actually is

elsys-bg.org is a Bulgarian technical school's site run by Sweboo (StudioX, 2017-era PHP CMS). The school's web presence is, in practice: **an active news operation** (Erasmus announcements weekly, admission updates), **a set of ~40 mostly-static info pages** organized in a 2-level tree, **document downloads** (curricula, rules), and **a handful of curated showcases** (clubs, team, galleries, partners). It is maintained by students who graduate every 2 years, occasionally edited by teachers, and must meet EU public-sector bars (WCAG 2.1 AA, GDPR).

The rewrite (Next.js 14 / Prisma / Postgres) has a solid engine — pages tree, news with versions + DeepL, page builder, auth, audit, caching — and weak everything-else: no SEO layer, half-empty block set, generic dark template that carries zero school identity, a routing hack that taxes every request, and a broken local dev right now.

## 2. Evidence over inheritance: what the admin data says

Last-edit dates from the live Sweboo admin (2026-06-11):

| Alive (rebuild properly) | Last activity | Dead (do NOT rebuild as CRUD) | Last activity |
|---|---|---|---|
| News | this week | Calendar + categories | 2021 |
| Pages / Text-HTML | this week | Internships + applications | 2017 |
| Documents | Feb 2026 | Prep courses | 2018 |
| Clubs | Dec 2025 | Carousel slides | 2018 |
| Team + categories | Nov 2025 | Testimonials | 2021 |
| Galleries | Oct 2025 | Leaders (alumni) | 2019 |
| Partners + categories (Erasmus) | Mar 2025 | Awards | 2020 |
| Projects (Erasmus) | 2023 | ТУЕС в числа | 2023 |

Other findings from the live admin: Team and Text/HTML grids are littered with untitled ("- БЕЗ ЗАГЛАВИЕ -") records — required titles + friendly validation are load-bearing. Global settings are just 4 values (home page id + default meta). Navigation is two menus (Main, Footer). The news edit form — parent page (category), title, short description, TinyMCE body, gallery, featured image, color, date, visibility — is one screen and genuinely simple; **it is the UX bar the rewrite must meet or beat, and the current rewrite's block/markdown news builder is more complex than what teachers have today.**

### Scope ruling (operator decision, overridable by Martin)

- **First-class content types (CRUD + public routes + blocks):** News, Page, Document, Club, Gallery, TeamMember(+category), Partner(+category), Project, **Award, Leader** (image-bearing yearly-append lists — promoted per D-10 ruling).
- **Demoted to page content** (Zod-formed block props via the builder — no dedicated model/admin): Numbers, Testimonials. Rarely edited; blocks with proper field forms suffice. All content stays publicly visible.
- **Kept minimal:** Carousel (already built; it's the homepage hero), HeaderAccent (tiny, useful for announcements).
- **Dropped:** Calendar, Internships, Prep Courses — dead for 5–9 years; Internships' application log is also a GDPR liability we decline to inherit. Their legacy URLs get redirects to sensible pages. Resurrecting any later is one content-type PR. ✅ DECISION D-10 RESOLVED 2026-06-11 (Martin): compromise — Awards + Leaders first-class, Numbers + Testimonials blocks, dead three dropped.

## 3. Architecture verdicts (full-freedom review)

**Keep as-is:** Prisma schema's Page tree (hierarchy + kinds), news system (versions, DeepL, scheduled publish), `lib/cache.ts` three-tier cache, AuditLog discipline, the admin content scaffold/registry concept, PageBuilder core interaction model, CI.

**Rewrite / fix — these are decisions, not suggestions:**

1. **R1 — Routing aliases.** `middleware.ts` does an HTTP fetch to `/api/route-alias` (which runs a Prisma query) on **every** locale-prefixed request. Replace with: alias resolution inside the `[...slug]` resolver itself via `lib/cache.ts` (namespace `routes`), plus a `RouteRedirect` table consulted on 404 only. Middleware goes back to auth gate + next-intl only. Delete `/api/route-alias`.
2. **R2 — SEO layer.** There is no `generateMetadata` in the entire app. Add: SEO fields on Page/NewsPost (metaTitle, metaDescription, ogImage, noindex, canonical), `generateMetadata` on every public route, hreflang pairs via `groupId`, JSON-LD (EducationalOrganization, NewsArticle), enriched sitemap + `sitemap-news.xml`, OG image route. The legacy site has default meta in 4 global settings — port those as the fallback chain.
3. **R3 — One publication model.** Migrate `Page.published` and `NewsPost.published` booleans to the `PublishStatus` enum the new types already use (map legacy tri-state: Draft → DRAFT, Preview → PREVIEW, Active → PUBLISHED). One mental model for editors, one query helper (`isPublic`) for code.
4. **R4 — Block system.** Registry entries get Zod schemas (replacing hand-rolled validators) and a declared data dependency (`needs: 'news' | 'clubs' | …`); the page resolver prefetches all declared needs in one `Promise.all` through `lib/cache.ts`. Public "not implemented yet" placeholder blocks are removed — a block either renders or isn't registered. Target block set: CarouselHero, Section, Markdown, NewsList, ClubGrid, GalleryGrid (+lightbox), DocumentList, TeamGrid, PartnerStrip, NumberStats, Testimonials, CTA, ContactBlock, HeaderAccent.
5. **R5 — One source of truth for the homepage.** The DB page wins; delete the `content/{locale}/home.json` fallback path after its content is migrated into blocks/seed. Same for `loadBlogJson`.
6. **R6 — Design = ТУЕС identity, light-first.** The current dark generic theme is replaced: light theme default (dark stays as toggle), school blue (#2f9ad0-family from the legacy palette), real Elsys logo, Cyrillic-subset self-hosted `.woff2`, typography and warmth matching a school — not a SaaS dashboard. Public IA mirrors the legacy nav (Училището / Обучение / Прием / Ученически живот / Новини / Европроекти / Контакти) since those URLs, names, and Google's index are an asset.
7. **R7 — Admin language.** Admin defaults to Bulgarian everywhere (it already half-does); every label through `messages/bg.json`.

## 4. The milestones

Milestone-driven, no calendar. Each ends deployable. (Free tiers only; observability = Vercel built-ins + uptime ping on `/api/health` — standing decisions D1–D9 carried over from the decision log, see §6.)

### M0 — Stop the bleeding
- 0.1 **Fix the client bootstrap.** Local dev serves pages whose JS loads but never hydrates (no `window.next`, no React fibers, zero console errors; reproduced in Chrome + Safari; survives `.next` wipe). Working tree is dirty mid-`feat/3-club` — first suspect. Bisect: stash → verify → reintroduce. Nothing else ships until interactive pages are proven by a Playwright check that *fails on hydration loss* (assert a click works, not just DOM presence).
- 0.2 Land or revert the half-done Club branch; leave `main` green.
- 0.3 R1 (routing aliases out of middleware). 
- 0.4 R3 (PublishStatus migration). ⚠ schema change, needs Martin's go.
- 0.5 Fix seed: news images point at nonexistent `/images/news/*.jpg`; seed must ship with real placeholder assets. Add `/api/health` + free uptime ping.

### M1 — Look like ТУЕС (R6)
- 1.1 Design tokens + light theme + logo + fonts. 
- 1.2 Public IA = legacy nav structure; BG slugs are canonical, EN mirrors via `groupId`.
- 1.3 Homepage rebuilt as DB blocks matching legacy sections (hero carousel, news+events, blog strip, Inspiration Talks, why-TUES, numbers) — then R5 (delete home.json path).
- 1.4 R2 SEO layer in full.
- Exit: a side-by-side with the legacy homepage reads as "same school, better site"; Lighthouse ≥95/95/95.

### M2 — Content engine completion
- 2.1 R4 block system rework (Zod + data deps + real block set).
- 2.2 Media library (folders, drag-drop, required alt, `consentRecordedAt` for minors' photos) + picker used everywhere.
- 2.3 Content types per §2 ruling: Document, Gallery, Club (finish), TeamMember, Partner, Project, Award, Leader — one PR each, cookie-cutter off the Carousel/Club pattern; write `docs/patterns/new-content-type.md` after the first.
- 2.4 News: category (parent page) + color tag for parity with Sweboo; related posts.

### M3 — Editors win
- 3.1 **Simple mode = the Sweboo form, modernized.** One screen: title, excerpt, TipTap body (curated toolbar), gallery, featured image, category, date, visibility. No blocks visible. TEACHER role lands here; Advanced (builder) is a toggle.
- 3.2 Auto-save (localStorage 5s + server draft 30s) with crash recovery; required titles; friendly Bulgarian Zod messages (`lib/content/validation.ts`).
- 3.3 Inline edit on the public site for logged-in admins (`<Editable>` → drawer → same Server Action → revalidate).
- 3.4 Image cropper for slots with fixed ratios; real date-time picker; bulk publish/archive on lists.
- 3.5 Hallway test: one non-technical adult publishes a news post start-to-finish; fix what stopped them.

### M4 — Migration (scrape-based; StudioX won't help)
- 4.1 Idempotent per-type importers (`scripts/import/`), `legacyId` kept, TinyMCE HTML → TipTap; images re-uploaded to Blob.
- 4.2 `RouteRedirect` backfill: every legacy URL (including dropped types' URLs and `/novini-i-sybitija/novini/<slug>-<id>` news pattern) resolves. 
- 4.3 EN pass: DeepL everything, human review on home/admissions/about; translation-status indicator in admin (missing / machine / current).
- 4.4 Visual-diff harness (Playwright + pixelmatch) legacy vs new on a fixed URL list; iterate until boring.

### M5 — Successors & compliance
- 5.1 Roles: TEACHER / STUDENT_EDITOR / STUDENT_ADMIN / ADMIN, matrix in `lib/auth/permissions.ts`, enforced in Server Actions. ⚠ auth change — Martin approves.
- 5.2 `/admin/help` runbooks (add-news, change-academic-year, restore-deleted, season-handover…), onboarding tour, per-record successor notes.
- 5.3 `/admin/handover` succession flow + 2FA for ADMIN. ⚠ auth.
- 5.4 GDPR: consent banner (analytics only), privacy page, contact-form retention (IP anonymized 30d, purged 2y), DPAs filed. Contact form itself (Turnstile + rate limit + Resend) lands here.
- 5.5 Accessibility pass + axe in CI.

### M6 — Cutover (hard-blocked by track T-A)
Dress rehearsal on staging → freeze legacy admin → final import + visual diff → DNS (TTL pre-dropped) → 48h watch → legacy parked at `legacy.elsys-bg.org` for a quarter. Rollback = DNS revert.

## 5. Track T-A — school buy-in & GDPR ownership (Martin, non-code)

Unchanged and still the #1 project risk: this is a student initiative; nobody with authority has approved replacing the school's site, no one school-side owns GDPR, DNS control is unconfirmed, prod accounts are unprovisioned (use a shared role email when creating them). The working demo after M1 *is* the pitch deck. M6 does not start without: named school sponsor, named GDPR owner, confirmed DNS authority.

## 6. Standing decisions

D1 free-tier observability · D2 scrape-only migration · D3 EN = DeepL + human review on key pages · D4 no deadline, quality wins · D5 no formal teacher testing, one hallway test · D6 credentials + 2FA, OAuth only if school Workspace materializes · D7–D9 (state-audit, seeded sandbox, T-A gate) · D-10 ✅ resolved (compromise — see §2) · D-11 (this doc): rewrite rulings R1–R7 · D-12 (2026-06-11, Martin): operator decides autonomously; Martin is consulted only on real-world irreversibles (destructive prod data ops, DNS cutover, spending, school-binding commitments) or genuine uncertainty. Schema-change approvals previously reserved for Martin now sit with the operator. · D-13 (2026-06-12, Martin): M1 design = Direction A "Наследството" — legacy light-blue brand modernized; white surfaces, navy ink headings, blue CTAs, light-first with dark toggle. Continuity over reinvention.

## 7. What success looks like

A visitor can't tell the school changed CMSes except everything is faster and findable on Google. A teacher publishes news in under 5 minutes without training. A new student admin onboards from `/admin/help` alone. Every legacy URL resolves. Lighthouse ≥95 across the board. The school board sees an annual review report. And in 2028, two students we've never met run this without us.

## 8. Discovered TODOs (logged 2026-06-11, during M0)

- **[LOW] Aliased paths can serve stale ISR for up to 300s after a mutation.** M0.3 moved alias resolution into the `[...slug]` resolver; admin mutations `bumpCacheVersion("routes")` (clears the alias map) and `revalidatePath` the **canonical** locale layouts, but the *aliased* URL's ISR entry isn't explicitly revalidated, so it can lag by the 300s ISR window. Acceptable for now (aliases are stable nav structure). If it ever matters, revalidate alias paths too (or drop the alias ISR entry on mutation). Belongs near M4.2 (RouteRedirect table).

- **[HIGH] ~~Generic content create/edit form hangs server-side for ALL content types.~~ DONE (2026-06-11, fix/m0-content-scaffold-serialization).** `[type]/new` and `[type]/[id]` passed the full `ContentTypeConfig` (incl. the Zod `schema`, a class instance) into the client `ContentForm`; Zod schemas are not RSC-serializable, so Next threw `Only plain objects … can be passed to Client Components` on a render timer and the response stream never closed. Fixed: added `ClientContentTypeConfig = Omit<ContentTypeConfig, "schema">` in `lib/content/shared.ts`; the pages strip `schema` at the boundary; the Server Action still validates with the same `getContentType(type).schema` (no validation fork). Create-and-save e2e (with persistence assertion) added for carousel + club.
- **[MED] ~~Admin e2e login selector is wrong.~~ DONE (2026-06-11).** `app/admin/login/page.tsx` inputs now have `name="email"`/`name="password"` (+ autoComplete); `tests/e2e/carousel-admin.spec.ts` + `club-admin.spec.ts` use the name selectors and exercise create-and-save.
- **[LOW] `app/api/navigation/route.ts` `force-dynamic` reverted.** The mid-task working tree carried an unexplained `export const dynamic = "force-dynamic"` on the navigation API route (unrelated to M0). Reverted during cleanup to keep the branch scoped — re-apply deliberately if the nav route needs to bypass Next's full-route cache.
- **[LOW] `.gitignore` hygiene.** `tsconfig.tsbuildinfo` is tracked but is a generated TS incremental cache (re-dirties on every build); `.playwright-mcp/` (MCP screenshots) is untracked junk. Both should be git-ignored (and `tsconfig.tsbuildinfo` `git rm --cached`).
- **[LOW] Migration `20260610152704_init` is mis-named.** Content is a clean additive `add_club` migration, but it's already applied to the shared dev DB (Accelerate/Neon), so renaming the folder would cause drift. Rename only via a coordinated reset, or leave as-is.
- **[LOW] `CarouselHero` uses `next/image`, which won't render the seeded SVG placeholders without `dangerouslyAllowSVG`.** Moot until a page actually places a `CarouselHero` block (none does today); resolve by replacing the carousel placeholders with real images via the M2.2 media library, not by enabling SVG optimization (security posture).
- **[MED] R3 phase-two cleanup: drop the `Page.published` / `NewsPost.published` boolean columns.** M0.4 added `status PublishStatus` and dual-writes both during the transition; once M1 has soaked, a follow-up PR removes the booleans, the dual-write in the mutation handlers + `lib/news.ts` + `prisma/seed.js`, and the `published` field from `PostItem`/selects. `PageVersion`/`NewsPostVersion` keep their boolean (snapshots).
- **[LOW] `app/sitemap.ts` is static (hardcoded routes, no DB read).** When R2/M1.4 makes it dynamic, route its Page/NewsPost reads through `publicWhere()` (lib/content/shared.ts) so unpublished/scheduled content stays out of the sitemap.
- **[LOW] (M2 cleanup) Verify the news block-render path doesn't depend on the page block registry.** The news seed (`prisma/seed.js`) authors block types `Heading`/`Paragraph`/`Callout` that aren't in `lib/blocks/registry.tsx`; the public `[...slug]`/page renderer (`renderBlocks`) silently skips unknown types. It's masked because public news renders via `bodyMarkdown`/the serializer and the news-article block system is intentionally separate from the page registry (by design from E2). Likely a non-issue — confirm the news-article render path never falls through to the page registry; if it does, it's a quick registry/serializer fix. (Logged during H, 2026-06-16.)
