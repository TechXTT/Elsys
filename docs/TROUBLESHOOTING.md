# Troubleshooting Guide

This document tracks issues encountered during development and their solutions.

---

## Table of Contents

1. [Redis Connection Issues](#redis-connection-issues)
2. [Prisma Database Issues](#prisma-database-issues)
3. [Build & Development Issues](#build--development-issues)

---

## Redis Connection Issues

### Issue: `ENOTFOUND` - Redis Host Not Found

**Error Message:**
```
[ioredis] Unhandled error event: Error: getaddrinfo ENOTFOUND redis-14365.c311.eu-central-1-1.ec2.cloud.redislabs.com
    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:122:26)
    at GetAddrInfoReqWrap.callbackTrampoline (node:internal/async_hooks:130:17)
```

**Followed by:**
```
MaxRetriesPerRequestError: Reached the max retries per request limit (which is 20). Refer to "maxRetriesPerRequest" option for details.
```

**Symptoms:**
- Application returns HTTP 500 errors
- Console floods with repeated `[ioredis] Unhandled error event` messages
- Prisma queries succeed but overall request fails
- Request hangs for ~25+ seconds before timeout

**Root Cause:**
The `REDIS_URL` environment variable points to a Redis server that no longer exists or is unreachable. This commonly occurs when:
1. Switching Redis providers (e.g., from Vercel KV to another provider)
2. Redis server was deleted/expired
3. Network/firewall changes blocking access
4. DNS propagation delays after server migration

**Solution:**

1. **Update the environment variable** in your `.env` file:
   ```bash
   # Old (broken)
   REDIS_URL=redis://default:xxx@redis-14365.c311.eu-central-1-1.ec2.cloud.redislabs.com:14365

   # New (update with correct URL from your Redis provider)
   REDIS_URL=redis://default:xxx@your-new-redis-host.com:port
   ```

2. **If using Vercel**, update in Vercel Dashboard:
   - Go to Project Settings > Environment Variables
   - Update `REDIS_URL` with the new connection string
   - Redeploy the application

3. **For local development without Redis** (temporary workaround):
   - Remove or comment out `REDIS_URL` from `.env`
   - The app will run without caching (see [lib/redis.ts](../lib/redis.ts) - returns `null` if no URL)

4. **Restart the development server** after changing environment variables:
   ```bash
   # Stop the current server (Ctrl+C) then:
   npm run dev
   # or
   pnpm dev
   ```

**Related Files:**
- [lib/redis.ts](../lib/redis.ts) - Redis client initialization
- [lib/navigation-build.ts](../lib/navigation-build.ts) - Uses Redis for caching navigation
- `.env` / `.env.local` - Environment configuration

**Prevention:**
- Keep Redis credentials in a password manager
- Document Redis provider details in team wiki
- Set up monitoring/alerts for Redis connection health
- Consider implementing graceful degradation when Redis is unavailable

---

### Issue: Redis Connection Timeouts in Development

**Symptoms:**
- Slow page loads in development
- Occasional timeout errors

**Possible Causes:**
1. Redis server geographically distant from development machine
2. VPN interfering with connection
3. Firewall blocking outbound connections

**Solutions:**
1. Use a local Redis instance for development:
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine

   # Update .env.local
   REDIS_URL=redis://localhost:6379
   ```

2. Disable Redis for local development by removing `REDIS_URL` from `.env.local`

---

## Prisma Database Issues

### Issue: Unknown Field in Prisma Query

**Error Message:**
```
Invalid `prisma.newsPost.findMany()` invocation:

Unknown field `blocks` for select statement on model `NewsPost`. 
Available options are marked with ?.
```

**Symptoms:**
- Application crashes when loading news articles
- Error mentions "Unknown field" for a field that exists in schema
- Other Prisma queries may work fine

**Root Cause:**
The Prisma schema file (`prisma/schema.prisma`) has been updated with new fields, but the database hasn't been migrated yet. The Prisma Client is trying to query fields that don't exist in the actual database tables.

**Solution:**

1. **Create and apply the migration:**
   ```bash
   npx prisma migrate dev --name add_missing_fields
   # or
   pnpm prisma migrate dev --name add_missing_fields
   ```

2. **For production**, use:
   ```bash
   npx prisma migrate deploy
   ```

3. **Regenerate Prisma Client** (usually automatic, but if needed):
   ```bash
   npx prisma generate
   ```

**Prevention:**
- Always run migrations after schema changes
- Use `prisma db push` for rapid prototyping (development only)
- Check migration status: `npx prisma migrate status`

**Related Files:**
- `prisma/schema.prisma` - Schema definition
- `prisma/migrations/` - Migration history

---

### Issue: Prisma Query Retries

**Error Message:**
```
prisma:warn Attempt 1/3 failed for querying: This request must be retried
prisma:warn Retrying after 50ms
```

**Cause:**
This is usually a transient connection issue. Prisma has built-in retry logic for connection failures.

**When to be concerned:**
- If retries consistently reach attempt 3/3 and fail
- If combined with other errors (like Redis failures above)

**Solution:**
Check database connection string and ensure the database server is accessible.

---

## Build & Development Issues

### Issue: Module Not Found After Adding New Components

**Symptoms:**
```
Module not found: Can't resolve './components'
```

**Solution:**
Ensure the `index.ts` barrel file exports the new components:
```typescript
// app/admin/news/components/index.ts
export { NewsBuilderProvider, useNewsBuilder } from "./NewsBuilderContext";
export { NewsBuilderToolbar } from "./NewsBuilderToolbar";
// ... etc
```

---

## Environment Variable Checklist

When setting up or debugging the application, ensure these environment variables are correctly configured:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | No | Redis connection string (caching) |
| `BLOB_READ_WRITE_TOKEN` | For uploads | Vercel Blob storage token |
| `NEXTAUTH_SECRET` | For auth | NextAuth.js secret |
| `NEXTAUTH_URL` | For auth | Application URL |

---

## News Post Versioning System

### Overview

News posts now have automatic version history for rollback capability. Every time a post is created or updated, a snapshot is recorded in the `NewsPostVersion` table.

**Related Files**:
- [lib/news-versions.ts](../lib/news-versions.ts) - Versioning utilities
- [lib/news.ts](../lib/news.ts) - Auto-versioning on save
- [app/api/admin/news/[id]/route.ts](../app/api/admin/news/[id]/route.ts) - PATCH handler for version operations
- [prisma/schema.prisma](../prisma/schema.prisma) - `NewsPostVersion` model

### API Endpoints

#### Get Version History
```
GET /api/admin/news/[id]?action=versions&locale=bg
```

Returns array of versions:
```json
{
  "versions": [
    {
      "version": 2,
      "title": "Updated Title",
      "createdAt": "2026-01-12T09:00:00Z",
      "createdBy": { "name": "Admin", "email": "admin@example.com" }
    },
    {
      "version": 1,
      "title": "Original Title",
      "createdAt": "2026-01-12T08:00:00Z",
      "createdBy": null
    }
  ]
}
```

#### Restore a Version
```
PATCH /api/admin/news/[id]?action=restore&locale=bg
Content-Type: application/json

{ "version": 1 }
```

Restoring creates a new version (v3) with the content from v1, preserving full history.

### Troubleshooting

#### Issue: Versions Not Being Created

**Symptoms:**
- Create or update a post, but `NewsPostVersion` table remains empty

**Possible Causes:**
1. `userId` not being passed to `createNewsPost()` or `updateNewsPost()`
2. Database migration not applied

**Solutions:**
1. Check the POST/PUT handler in [app/api/admin/news/route.ts](../app/api/admin/news/route.ts) includes `authorId`:
   ```typescript
   const userId = (session.user as any)?.id as string;
   await createNewsPost({ ...payload, authorId: userId });
   ```

2. Verify migration was applied:
   ```bash
   npx prisma migrate status
   # Should show: ✓ 20260112070243_add_news_post_versioning
   ```

3. If migration missing, run:
   ```bash
   npx prisma migrate dev --name add_news_post_versioning
   ```

#### Issue: "Restore failed" Error

**Symptoms:**
- Calling restore endpoint returns 400 error

**Possible Causes:**
1. Version doesn't exist
2. Wrong locale specified
3. Database connection issue

**Solutions:**
1. Verify version exists:
   ```bash
   # In database
   SELECT * FROM "NewsPostVersion" WHERE "newsPostId" = 'article-slug' AND "newsPostLocale" = 'bg';
   ```

2. Check locale parameter is correct (bg or en)

3. Verify database connection is working:
   ```bash
   npx prisma db execute --stdin < /dev/null
   ```

#### Issue: Too Many Old Versions Consuming Space

**Solutions:**
Use the `pruneNewsPostVersions()` function to keep only recent versions:

```typescript
import { pruneNewsPostVersions } from '@/lib/news-versions';

// Keep only last 10 versions
await pruneNewsPostVersions({
  slug: 'article-slug',
  locale: 'bg',
  keepCount: 10
});
```

---

## Quick Diagnostics

### Check Redis Connection
```bash
# Using redis-cli
redis-cli -u $REDIS_URL ping

# Expected output: PONG
```

### Check Database Connection
```bash
npx prisma db pull --print
# Should print current schema without errors
```

### Check Environment Variables
```bash
# List all env vars (be careful with secrets!)
npx env-cmd -f .env.local -- printenv | grep -E "REDIS|DATABASE"
```

---

## Reporting New Issues

When encountering a new issue, document it with:
1. **Error message** - Full error text and stack trace
2. **Symptoms** - What the user experiences
3. **Root cause** - Why it happens
4. **Solution** - How to fix it
5. **Related files** - Which files are involved
6. **Prevention** - How to avoid it in the future
