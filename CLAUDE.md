# CLAUDE.md — Working context for Claude Code

You are working on the **ТУЕС (Elsys) school website rewrite**: a Next.js 14 App Router replacement for `https://elsys-bg.org/` (legacy: Sweboo by StudioX, PHP-style admin, ~20 content types). Multilingual BG/EN, Prisma-backed CMS, block-based page builder, real auth.

Your task brief (pasted per session by the operator) is the source of truth for current state and scope. This file holds only the standing rules. The full delivery plan is `docs/PARITY_AND_IMPROVEMENT_PLAN.md` — read the section your brief names, not the whole file.

---

## 1. Constraints (drive every design decision)

1. **Generational admin turnover.** Student admins graduate every 2 years. The system must teach itself to successors: in-app runbooks, notes-for-successors, audit log, handover flow.
2. **Teachers edit without learning the block model.** Simple vs Advanced mode, templates, friendly Bulgarian validation, auto-save.
3. **Public-sector EU production.** WCAG 2.1 AA, GDPR, JSON-LD, 2FA for admins. Free-tier infrastructure only — flag anything that needs a paid plan.

If a task conflicts with one of these, stop and surface it.

## 2. Locked tech choices

Do not re-debate or silently swap. Next.js 14 App Router · Prisma 6 · Postgres on Neon · Upstash Redis · Vercel Blob · NextAuth v4 (credentials + bcrypt; Google OAuth maybe later) · Resend · `next/image` · Postgres FTS · TipTap · React Hook Form + Zod · Cloudflare Turnstile · DeepL · Vercel Web Analytics.

Observability = Vercel built-ins + free uptime ping on `/api/health`. No Sentry/Axiom/Better Stack (decision D1, 2026-06-10).

New admin mutations use **Server Actions**. `app/api/admin/**/route.ts` is deprecated for new code but stays alive.

## 3. Working agreements (non-negotiable)

1. One change per branch. Unrelated cleanup → log a TODO and skip.
2. Prisma schema change ⇒ migration + seed update in the same PR.
3. Every admin mutation: write `AuditLog` (`lib/audit.ts`), invalidate the relevant cache **before** `revalidatePath`, revalidate both `bg` and `en`.
4. Every public Prisma read uses explicit `select`. No unprojected `findMany()` on public paths.
5. Every public list read goes through `lib/cache.ts` (`getCached`/`bumpCacheVersion`, memory → Redis → DB, versioned invalidation). It exists — follow `lib/news.ts` as the reference consumer.
6. Every user-facing string lives in `messages/bg.json` / `messages/en.json`. No hardcoded Cyrillic or English in JSX. Bulgarian is the default admin language.
7. All input validation via Zod, wrapped in friendly Bulgarian messages (`lib/content/validation.ts`, create if missing).
8. Never run a destructive migration or delete data without explicit human approval.
9. Stop and ask if a task touches auth, deletion of production data, or schema renames.

## 4. Workflow per task

1. Open the files the brief names. Confirm state matches.
2. Reply with what you'll change in 5 bullets with absolute paths. STOP, wait for "go".
3. After "go": branch `feat|fix/<phase>-<task>`, implement, migrate + seed if schema changed, update `messages/{bg,en}.json`, add/update one Playwright happy-path test.
4. While iterating: `pnpm typecheck` (fast). Before reporting done: `pnpm lint && pnpm build` once, plus only the affected Playwright test file.
5. Verify manually with `pnpm dev`.
6. Report: branch, files changed, acceptance checklist, TODOs, deviations.

## 5. Repo map

```
app/[locale]/                 Public routes (BG/EN); [...slug] = batched hierarchical resolver, ISR 300s
app/admin/                    Admin UI: pages (PageBuilder), news, navigation, users, audit, components/
app/api/admin/                Deprecated REST endpoints
components/                   Public components
lib/
  cache.ts                    Memory→Redis→DB cache helper (getCached/invalidateCache/bumpCacheVersion)
  news.ts                     News reads/writes; reference consumer of cache.ts; revalidateNews()
  navigation-cache.ts         Nav memory cache; nav also uses a Redis version key
  auth.ts / audit.ts / prisma.ts / redis.ts / blocks/registry.tsx / cms.tsx
prisma/schema.prisma          Source of truth; migrations/; seed.js
messages/{bg,en}.json         All UI strings (next-intl)
middleware.ts                 Admin auth gate + route-alias rewrites
docs/                         PARITY_AND_IMPROVEMENT_PLAN.md (THE PLAN), BUILDER_UX_ANALYSIS.md,
                              news-system.md, navigation-system.md, page-builder-system.md,
                              PERFORMANCE_OPTIMIZATIONS.md, TROUBLESHOOTING.md, audits/
scripts/                      import-from-elsys-bg.mjs, scrape-static-pages.ts (migration is scrape-based)
```

Doc to read per area: builder → `BUILDER_UX_ANALYSIS.md` + `page-builder-system.md`; news → `news-system.md`; nav → `navigation-system.md`; auth → `authentication-authorization-audit.md`; caching/perf → `PERFORMANCE_OPTIMIZATIONS.md`.

## 6. Commands

```bash
pnpm dev | build | lint | typecheck | test | test:e2e
pnpm prisma:generate | prisma:migrate | prisma:seed
pnpm cms:import-live | pages:scrape
```

Env: `PRISMA_DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `BLOB_READ_WRITE_TOKEN`, `DEEPL_API_KEY`.

## 7. Refuse to do

Destructive prod migrations without approval · hardcoded strings in JSX · new REST admin routes · schema change without migration · mutation without AuditLog or revalidation · unprojected public `findMany()` · new top-level dependency without justification against §2 · bundling multiple tasks in one PR.

## 8. If you have no brief

Ask the operator for one. Do not pick a task from the plan yourself.
