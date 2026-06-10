# Admin Route Invalidation Audit — 2026-06-10

Scope: every mutating handler under `app/api/admin/**/route.ts`.

Columns: **AuditLog** (✅/❌), **revalidatePath both locales** (✅/❌/n-a), **Cache invalidation** (✅/❌/n-a), **Ordering correct** (✅/❌/n-a).

| File | Method | AuditLog | revalidatePath (both) | Cache invalidation | Ordering |
|---|---|---|---|---|---|
| admins/route.ts | POST | ✅ patched | n/a | n/a | n/a |
| admins/[id]/route.ts | PATCH | ✅ patched | n/a | n/a | n/a |
| admins/[id]/route.ts | DELETE | ✅ patched | n/a | n/a | n/a |
| register/route.ts | POST | ✅ patched | n/a | n/a | n/a |
| me/route.ts | PATCH | ✅ patched | n/a | n/a | n/a |
| users/route.ts | POST | ✅ patched | n/a | n/a | n/a |
| users/[id]/route.ts | PATCH | ✅ patched | n/a | n/a | n/a |
| users/[id]/route.ts | DELETE | ✅ patched | n/a | n/a | n/a |
| users/[id]/reset-password/route.ts | POST | ✅ patched | n/a | n/a | n/a |
| news/route.ts | POST | ✅ | ✅ | ✅ | ✅ |
| news/[id]/route.ts | PUT | ✅ | ✅ | ✅ | ✅ |
| news/[id]/route.ts | DELETE | ✅ | ✅ | ✅ | ✅ |
| news/[id]/route.ts | PATCH (restore) | ✅ | ✅ | ✅ | ✅ |
| news/[id]/versions/route.ts | POST (restore) | ✅ | ✅ patched | ✅ patched | ✅ patched |
| news/translate/route.ts | POST | ✅ | n/a (no DB write) | n/a | n/a |
| pages/route.ts | POST | ✅ | ✅ | ✅ | ✅ |
| pages/[id]/route.ts | PUT | ✅ | ✅ | ✅ | ✅ |
| pages/[id]/route.ts | DELETE | ✅ | ✅ | ✅ | ✅ |
| pages/[id]/versions/route.ts | POST (restore) | ✅ | ✅ patched | ✅ patched | ✅ patched |
| navigation/route.ts | POST | ✅ | ✅ | ✅ | ✅ |
| navigation/[id]/route.ts | PUT | ✅ | ✅ | ✅ | ✅ |
| navigation/[id]/route.ts | DELETE | ✅ | ✅ | ✅ | ✅ |
| pages/slugs/route.ts | GET only | n/a | n/a | n/a | n/a |
| dashboard/* | GET only | n/a | n/a | n/a | n/a |

## Patches applied

1. `admins/route.ts` POST — added `ADMIN_CREATE` audit with acting user id.
2. `admins/[id]/route.ts` PATCH — added `ADMIN_UPDATE` audit.
3. `admins/[id]/route.ts` DELETE — added `ADMIN_DELETE` audit.
4. `register/route.ts` POST — added `ADMIN_REGISTER` audit (userId null; unauthenticated bootstrap endpoint).
5. `me/route.ts` PATCH — added `ME_UPDATE` audit including password-change flag.
6. `users/route.ts` POST — added `USER_CREATE` audit.
7. `users/[id]/route.ts` PATCH — exposed `me` from `requireAdmin`, added `USER_UPDATE` audit.
8. `users/[id]/route.ts` DELETE — added `USER_DELETE` audit.
9. `users/[id]/reset-password/route.ts` POST — exposed `me` from `requireAdmin`, added `USER_RESET_PASSWORD` audit.
10. `news/[id]/versions/route.ts` POST — added `revalidateNews([params.id])` **before** audit log (cache bump → revalidatePath ordering preserved inside `revalidateNews`).
11. `pages/[id]/versions/route.ts` POST — added `invalidateNavigationCache()` + `invalidateNavigationTree()` + `revalidatePublicPages()` after `invalidatePageCache()`.

## TODOs logged

- `CLAUDE.md` §12 and §5 (bullet 5) are stale: `lib/cache.ts` already exists and task 0.2 is done. Update CLAUDE.md to reflect current state.
- `feat/0-playwright-smoke` branch was abandoned mid-session; playwright.config.ts and tests/e2e/ are now bootstrapped as part of this PR (the audit test requirement brought it in scope together).
