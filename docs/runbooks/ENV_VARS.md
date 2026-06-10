# Environment Variables

Every environment variable the application reads, where it is set, and what
breaks without it. Keep this file current: **any PR that adds a
`process.env.*` read must update this table and `.env.example`.**

Environments (see `docs/PARITY_AND_IMPROVEMENT_PLAN.md` §1): `production`
and `staging` set these in Vercel project settings; `preview` inherits from
Vercel with per-branch overrides; `dev` uses a local `.env` (never commit it).

## Required

| Variable | Used by | Notes |
|---|---|---|
| `PRISMA_DATABASE_URL` | `prisma/schema.prisma` (datasource), all DB access | Postgres connection string. Production uses a Prisma Accelerate URL (`prisma+postgres://…`) which pairs with the `prisma generate --no-engine` postinstall. Direct `postgres://…` URLs (local dev, CI) need a plain `prisma generate` — see `.github/workflows/ci.yml`. |
| `NEXTAUTH_SECRET` | `lib/auth.ts`, `middleware.ts` (JWT verify) | Sign-in breaks and `/admin` becomes unreachable without it. Generate with `openssl rand -base64 32`. Rotating it logs everyone out. |
| `NEXTAUTH_URL` | NextAuth callbacks | Set to the canonical site URL on every deployed environment. Optional on localhost. |
| `BLOB_READ_WRITE_TOKEN` | `@vercel/blob` `put()` in `app/api/admin/news/*` | Admin image uploads fail without it. One token per Blob store (prod/staging/preview use separate stores, plan §1). |

## Optional (feature degrades gracefully)

| Variable | Used by | Without it |
|---|---|---|
| `REDIS_URL` | `lib/redis.ts` → `lib/cache.ts`, `lib/navigation-build.ts` | Caches fall back to per-instance memory only. Public site still works; cross-instance invalidation is lost. Local dev: `docker run -d -p 6379:6379 redis:7-alpine` and `redis://127.0.0.1:6379`. |
| `DEEPL_API_KEY` (or legacy alias `DEEPL_AUTH_KEY`) | `app/api/admin/news/translate` | Auto-translate becomes a no-op that returns the original text. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `prisma/seed.js` | Seed bootstraps the admin user as `admin@elsys.bg` / `admin123`. Override both anywhere the seed runs against a shared database. |
| `ALLOW_ADMIN_REGISTRATION` | `app/api/admin/register` | Registration endpoint is disabled unless explicitly enabled. Keep unset in production. |

## Set automatically — do not configure

| Variable | Source |
|---|---|
| `NODE_ENV` | Next.js (`development` / `production`) |
| `VERCEL_*` | Vercel runtime |

## Conventions

- `.env.example` is the authoritative template — copy to `.env` for local dev.
- Secrets live only in Vercel env settings and local `.env` files; never in git.
- Rotation procedure: `docs/runbooks/ROTATE_SECRETS.md` (to be written, plan §8.7).
- CI defines its own throwaway values in `.github/workflows/ci.yml` (service-container Postgres, dummy `NEXTAUTH_SECRET`).

## Known issues

- A stale `REDIS_URL` (after a Redis provider migration) causes `WRONGPASS` /
  `ENOTFOUND` noise in logs; caches silently degrade to memory. See
  `docs/TROUBLESHOOTING.md`.
