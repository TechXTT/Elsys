# ELSYS rewrite — launch runbook

The Figma design and the buildable code scope are **complete**. What follows is everything left to go live — all of it review, QA, sign-off, or cutover, not feature building. Ordered.

## 0. Status snapshot
- **Design:** full system + all public + admin + gap screens + clickable prototype (Figma `XEzq02ipzOdJewgep9H0tk`).
- **Code:** A–K + the autonomous run (media, 10 content types, blocks R4, news parity, editor simple+inline+UX, SEO, roles + 2FA + security hardening, GDPR consent, DB-driven homepage, dev import w/ redirects + media→Blob, axe-clean AA, visual-regression + content-parity harnesses). Stack is linear off `main@11a5f02`, branches unmerged.
- e2e ~104 green; axe 9/9 strict; visual 56/56 baseline.

## 1. Merge the stack → main
- A dedicated integration instance PRs the linear stack bottom-up and merges to `main` up to `feat/M5-5-muted-contrast` (5975678). Keep `main` green (install → prisma generate → seed → typecheck/lint/build/e2e).
- Then **rebase `feat/M4-4-visual-qa` (108247f) onto the new `main`** and merge it as the final PR (sequential, no conflicts expected).
- Do not squash the whole stack into one commit — preserve one-commit-per-phase history.

## 2. Tracked follow-ups (non-blocking; schedule post-merge / M2)
- **7 import content-parity gaps** — legacy "item" pages (inspiration-talks, ekskurzii, …) keep body outside `.single-text`; importer misses it. Fix path A: editors reclassify/re-extract on review. Fix path B (small eng task): extend the extractor to read the alternate container for item-type pages, then re-run `pnpm import:parity`. Detail: `scripts/import/.cache/parity-report.json`.
- **~590 raw `slate-*`/`gray-*` admin-chrome utilities** — tokenization refactor (own branch).
- **Typed extractors** (Club/Team/Partner/Gallery/Project/Award/Leader) — only if a structured legacy source surfaces; otherwise editor reclassification stands.
- **TipTap migration** — markdown editor works today; swap is a storage/render migration if richer editing is wanted.

## 3. Pre-launch QA
- [ ] **Lighthouse ≥95/95/95** on Home + a content page + an article (PLAN M1 exit).
- [ ] `pnpm test:visual` baseline run clean; refresh baselines once content is final.
- [ ] **axe in CI** wired (the suite exists — add it to the CI workflow); 0 serious/critical.
- [ ] **Manual screen-reader pass** (NVDA/VoiceOver) on the primary journeys + the admin editor.
- [ ] **M3.5 hallway test** — one non-technical adult publishes a news post start-to-finish; fix whatever stopped them.

## 4. Content review + publish (editors / DPO)
- [ ] Review + publish the imported **DRAFT** pages/news (65 pages, 19 news).
- [ ] Set dates on the **14 undated news** (flagged "дата липсва"); never fabricated.
- [ ] Resolve the **44 consent-flagged images** — record consent for student photos or remove.
- [ ] Review + publish the **machine-translated EN** drafts (legal pages excluded — human translation).
- [ ] **DPO completes** the legal templates (`/poveritelnost`, `/biskvitki`, `/dostapnost`) and signs off; confirm the cookie-banner posture (analytics opt-in; necessary-only otherwise).
- [ ] **3 EN legal pages** (`poveritelnost`/`biskvitki`/`dostapnost`) are currently **PUBLISHED but empty/Bulgarian** — must be human-translated (DPO) or unpublished before go-live (do NOT ship as-is). Left untouched by the EN coverage-stub cleanup precisely because legal is human-translation-only.
- [ ] Author the still-empty nav-root content pages.

## 5. Accounts + secrets
- [ ] Create real admin users; each **ADMIN + STUDENT_ADMIN enrolls TOTP 2FA** (mandatory gate enforces it). Use a shared role email for prod accounts (Track T-A).
- [ ] Set production env: `TOTP_ENCRYPTION_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET`, `RESEND_API_KEY` (+ `CONTACT_TO`/`CONTACT_FROM`, verified domain), `DEEPL_API_KEY`, `REDIS_URL`, `PRISMA_DATABASE_URL`, `NEXTAUTH_SECRET`/`NEXTAUTH_URL`, `BLOB_READ_WRITE_TOKEN`.
- [ ] Review the role **permission-matrix grants** (default in Figma `105:2`) with the school; tune if needed.

## 6. Track T-A — human gates (M6 cannot start without these)
- [ ] Named **school sponsor** who has approved replacing the site.
- [ ] Named **GDPR owner** (school-side).
- [ ] Confirmed **DNS authority** for elsys-bg.org.

## 7. M6 cutover (only after §1–§6)
1. Deploy to **staging**; dress-rehearsal the full flow.
2. **Freeze** the legacy Sweboo admin (no new edits).
3. Run the **production import** (`pnpm import:all --commit` against the PROD DB — this is the one previously-hard-stopped step; do it deliberately, with a DB backup first).
4. Run `pnpm import:parity` + a visual spot-check; confirm redirects resolve (99% coverage; verify the long tail).
5. **DNS switch** (TTL pre-dropped). Watch 48h (Vercel analytics + `/api/health` uptime ping).
6. Park legacy at `legacy.elsys-bg.org` for a quarter.
- **Rollback** = revert DNS. Keep the legacy site warm until the watch window passes.

## Success criteria (PLAN §7)
A visitor can't tell the CMS changed except it's faster and findable; a teacher publishes news in <5 min untrained; a new student admin onboards from `/admin/help` alone; every legacy URL resolves; Lighthouse ≥95; and in 2028 two students we've never met run it without us.
