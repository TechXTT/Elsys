# CLAUDE.md — Working context for Claude Code

You are working on the **ТУЕС (Elsys) school website rewrite**. Read this file first, every session.

---

## 1. What this project is

The live site is `https://elsys-bg.org/` running **Sweboo by StudioX 4.0.0** — a PHP-style admin built around ~20 first-class content types and a widget-based page builder. The site is run by students who graduate every year, so admin knowledge dies on a 2-year cycle. Some editors are teachers, not engineers. The site is a public-sector EU school, so GDPR and WCAG 2.1 AA matter.

This repo is the replacement: a Next.js 14 App Router rewrite with multilingual (BG/EN) support, a block-based page builder, a Prisma-backed CMS, and a real auth layer. The engine is partially built — Pages, News, Navigation, Auth, Audit, Dashboard. The rest of the content types and the editor UX still need to ship before we can cut over.

**The full delivery plan lives in `docs/PARITY_AND_IMPROVEMENT_PLAN.md`. Read it before any task. Don't infer scope from this file.**

---

## 2. Project constraints (drive every design decision)

1. **Generational admin turnover.** The system has to onboard a new admin without tribal knowledge — runbooks inside the admin, "notes for successors" per record, a sandbox environment, audit log with humans, annual review reminders, an `/admin/handover` succession flow. See plan §6.
2. **Teachers must be able to edit without learning the block model.** Simple vs Advanced editor mode, page templates with 3–5 fields, inline editing on the public site, auto-save, friendly Bulgarian validation messages, inline image cropper. See plan §5.
3. **Public-sector EU production.** WCAG 2.1 AA, full GDPR (consent, retention, export/delete), JSON-LD, sitemap-news, OAuth-restricted-to-school-domain, 2FA for admins, backups + restore drills. See plan §7 and §8.

If a task seems to conflict with one of these, stop and surface it.

---

## 3. Locked tech choices

Do not re-debate these. If you think one is wrong, say so and stop — don't silently swap.

| Concern | Pick |
|---|---|
| Framework | Next.js 14 App Router |
| ORM | Prisma 6 |
| DB | Postgres on Neon |
| Cache | Upstash Redis |
| Blob | Vercel Blob |
| Auth | NextAuth v4 (credentials + Google OAuth later) |
| Email | Resend |
| Images | `next/image` w/ Vercel loader |
| Search | Postgres FTS → Meilisearch only if scale demands |
| WYSIWYG | TipTap |
| Forms | React Hook Form + Zod |
| Validation | Zod (one schema, server + client) |
| Bot mitigation | Cloudflare Turnstile |
| Errors | Sentry |
| Logs | Axiom |
| Uptime | Better Stack |
| Translation | DeepL (already wired for News) |
| Analytics | Vercel Web Analytics (cookieless) |

New admin mutations use **Server Actions**, not REST. Existing `app/api/admin/**/route.ts` stays alive but is deprecated for new code.

---

## 4. Working agreements (non-negotiable)

1. **One change per branch.** No bundled refactors. Unrelated cleanup → log a TODO and skip it.
2. **Every Prisma schema change ships with a migration AND a seed update in the same PR.**
3. **Every admin mutation writes to `AuditLog`** (`lib/audit.ts`) and calls `revalidatePath` for both `bg` and `en`, and bumps the nav cache version key (see `lib/navigation-cache.ts`).
4. **Every public Prisma read uses explicit `select`.** No `findMany()` without projection on any code path that public routes hit.
5. **Every public list read goes through the memory→Redis→DB cache helper** (`lib/cache.ts` once created in Phase 0.2; until then, follow the pattern in `lib/navigation-cache.ts` + `lib/redis.ts`).
6. **Every user-facing string lives in `messages/bg.json` or `messages/en.json`** under namespaces. This includes admin labels, button text, empty states, error messages. No hardcoded Cyrillic or English in JSX.
7. **Bulgarian is the default admin language.** English is opt-in.
8. **All input validation uses Zod.** Wrap default Zod errors in friendly Bulgarian messages via `lib/content/validation.ts` (create it if missing).
9. **Never run a destructive migration in production without explicit human "yes, drop it" approval.** Same for any code that deletes data or rotates secrets.
10. **Stop and ask** if a task touches auth, billing, deletion of production data, or schema rename. Don't push through.

---

## 5. Workflow per task

1. Open the files the task references. Confirm current state matches the plan's description.
2. Reply with: what you'll change, in 5 bullets, with absolute file paths. Then STOP and wait for "go".
3. After "go": branch (`feat/<phase>-<task>` or `fix/<phase>-<task>`), implement, migrate if schema changed, update seed, update `messages/{bg,en}.json` for new strings, add or update one Playwright happy-path test for the new behavior.
4. Run `pnpm lint && pnpm build` — must pass.
5. Run `pnpm prisma migrate dev` if schema changed — must apply cleanly.
6. Manually verify with `pnpm dev` against the affected route or admin screen.
7. Open a PR using `.github/PULL_REQUEST_TEMPLATE.md` (create it if missing): what / why / screenshots if UI / migration notes / rollback plan.

---

## 6. Repo map (where things live)

```
app/
  [locale]/                  Public routes, BG/EN
    page.tsx                 Home (Hero/Tracks/Admissions/Testimonials/Numbers)
    [...slug]/page.tsx       Hierarchical resolver with batched query, ISR revalidate=300
    news/                    News index + detail
    blog/                    Blog index + detail
    layout.tsx               Locale shell
  admin/                     Protected admin UI
    page.tsx                 Dashboard entry
    DashboardClient.tsx      Stats + activity feed
    pages/                   Page editor (uses PageBuilder)
    news/                    News editor (block + markdown, see BUILDER_UX_ANALYSIS.md)
    navigation/              Navigation tree editor
    users/                   Admin user management
    audit/                   Audit log viewer
    components/              page-builder/, DataTable, PageHeader, Card, etc.
  api/
    admin/                   REST endpoints (deprecated; prefer Server Actions for new code)
    auth/[...nextauth]/
    navigation/
    route-alias/             Used by middleware for slug aliasing
components/                  Public-side components (Hero, NewsCard, PostCard, Section, etc.)
lib/
  auth.ts                    NextAuth config (credentials + bcrypt + JWT)
  audit.ts                   AuditLog write helper
  blocks/registry.tsx        Block registry for PageBuilder (Hero, Section, Markdown today)
  cms/compile.tsx            Compile blocks → React
  cms.tsx                    renderBlocks export
  content.ts                 Filesystem JSON loaders (legacy; being replaced by DB)
  nav.ts                     Public nav tree builder
  navigation-build.ts        DB-backed nav builder
  navigation-cache.ts        Memory cache for nav tree (60s TTL)
  news-versions.ts           News version restore logic
  news.ts                    News public reads + in-memory 60s list cache (Phase 0.2 target)
  prisma.ts                  Prisma singleton
  redis.ts                   ioredis singleton
  types.ts                   Shared TS types
prisma/
  schema.prisma              Source of truth — Page, NewsPost, NavigationItem, User, AuditLog, etc.
  migrations/                Applied migrations
  seed.js                    Seed script (block-based news included)
scripts/
  import-from-elsys-bg.mjs   Legacy site scraper (partial)
  scrape-static-pages.ts     Static page scraper
content/{bg,en}/             Filesystem content (home.json today; being lifted into DB)
messages/{bg,en}.json        next-intl translation files
i18n/                        next-intl config + routing
middleware.ts                Auth gate for /admin + route-alias rewriting
docs/
  PARITY_AND_IMPROVEMENT_PLAN.md   ← THE PLAN
  BUILDER_UX_ANALYSIS.md           UI patterns for News + Page builders
  PERFORMANCE_OPTIMIZATIONS.md     N+1 fixes, ISR, cache layers
  TROUBLESHOOTING.md               Common issues + Redis incident notes
  authentication-authorization-audit.md
  navigation-system.md
  news-system.md
  page-builder-system.md
  runbooks/                  (To be created — see plan §8.7)
  adr/                       (To be created)
  handover/                  (To be created)
```

---

## 7. Common commands

```bash
pnpm install
pnpm dev                          # next dev on :3000
pnpm build                        # next build
pnpm lint
pnpm prisma generate
pnpm prisma migrate dev --name <descriptive_name>
pnpm prisma db seed
pnpm prisma studio                # local only — never prod
pnpm cms:import-live              # scrape legacy site
pnpm pages:scrape                 # scrape static pages
```

DB connection via `PRISMA_DATABASE_URL` (Postgres). Redis via `REDIS_URL`. NextAuth via `NEXTAUTH_SECRET` + `NEXTAUTH_URL`. Vercel Blob via `BLOB_READ_WRITE_TOKEN`. DeepL via `DEEPL_API_KEY`. Full env matrix → `docs/runbooks/ENV_VARS.md` (create in Phase 0).

---

## 8. Existing state — what's already done (do not redo)

- Next.js 14 App Router + next-intl BG/EN
- Prisma schema for `User`, `Account`, `Session`, `Page` (with `PageKind` enum: PAGE/LINK/FOLDER/ROUTE), `NewsPost`, `PageVersion`, `NewsPostVersion`, `NavigationItem`, `AuditLog`, `OneTimeSecret`
- Public hierarchical resolver `app/[locale]/[...slug]/page.tsx` with **batched query** (avoids N+1), ISR `revalidate=300`
- News list with in-memory 60s cache, locale fallback, scheduled publishing via future-dated `date`
- Three-tier nav cache (memory → Redis → DB) with versioned invalidation
- NextAuth (credentials + bcrypt + JWT) with admin gate in `middleware.ts`
- One-time password reveal flow at `/one-time` for initial admin bootstrap
- Audit log table + writes from admin routes
- PageBuilder: palette/canvas/property panel, undo/redo, device preview, keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Shift+Z) — see `app/admin/components/page-builder/` and `docs/BUILDER_UX_ANALYSIS.md`
- News builder: block + markdown modes, image upload, featured image picker, version history, DeepL auto-translate
- Route-alias middleware at `middleware.ts` for legacy slug redirects (foundation; UI to add Phase 2.3)

---

## 9. What is NOT done yet (the work)

See plan §4 for the gap matrix. Highest level summary:

- 18 content types beyond Pages + News (Carousel, Club, Gallery, Document, Event, TeamMember, Partner, Leader, Award, Internship + InternshipApplication, Course, Project, Testimonial, NumberStat, HeaderAccent, BlockPreset, RouteRedirect, ContactSubmission).
- Generic admin scaffold at `app/admin/content/[type]/...` driven by a Zod registry.
- Editor UX layer (templates, Simple/Advanced toggle, inline editing, auto-save, version diff, image cropper).
- Generational handoff layer (roles, onboarding wizard, in-app runbooks, comments, sandbox env, succession flow).
- Operational layer (Sentry, Axiom, Better Stack, backups, runbooks, GDPR flows).
- Migration importers + visual-diff cutover.

---

## 10. How to brief yourself before any task

Before writing code on any task from the plan:

1. Read the relevant phase + task in `docs/PARITY_AND_IMPROVEMENT_PLAN.md`.
2. Open every file the task names. Confirm what's there.
3. Read the relevant existing doc:
   - Page builder work → `docs/BUILDER_UX_ANALYSIS.md` + `docs/page-builder-system.md`
   - News work → `docs/news-system.md`
   - Navigation work → `docs/navigation-system.md`
   - Auth/permissions → `docs/authentication-authorization-audit.md`
   - Performance / caching → `docs/PERFORMANCE_OPTIMIZATIONS.md`
4. If anything is ambiguous, stop and ask. Don't guess.

---

## 11. Refuse to do

- Make a destructive prod migration without explicit approval.
- Hardcode strings (especially Cyrillic) in JSX.
- Add a new REST admin route when a Server Action would do.
- Skip the migration when changing schema.
- Skip `AuditLog` write on a mutation.
- Skip `revalidatePath` on a mutation.
- Run `findMany()` without `select` on a public read path.
- Add a new top-level dependency without justifying it against the locked tech list in §3.
- Bundle multiple tasks into one PR.

---

## 12. Where to find the current task

The user will tell you which phase and task they want. The plan is the menu. If they don't specify, the first task is in plan §13: **Phase 0, Task 0.2 — promote the news cache into a reusable `lib/cache.ts` helper.**
