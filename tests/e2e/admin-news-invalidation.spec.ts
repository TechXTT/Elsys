/**
 * Happy-path e2e: mutate a news post via admin API and assert the public news
 * list reflects the change without waiting for TTL expiry.
 *
 * Requires: pnpm build && pnpm start (production server), or a running dev
 * server (reuseExistingServer is true when not in CI).
 * Seed creds: admin@elsys.bg / admin123.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { currentTotp } from "./_helpers";

const ADMIN_EMAIL = "admin@elsys.bg";
const ADMIN_PASSWORD = "admin123";

async function authenticateAdmin(request: APIRequestContext): Promise<void> {
  const csrf = await request.get("/api/auth/csrf");
  expect(csrf.ok()).toBeTruthy();
  const { csrfToken } = await csrf.json();

  // 2FA is mandatory for ADMIN now — include a current TOTP for the seeded admin.
  const login = await request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      token: currentTotp(),
      redirect: "false",
      callbackUrl: "/admin",
      json: "true",
    },
  });
  expect(login.status()).toBeLessThan(500);
}

test.describe("admin news mutation → public cache invalidation", () => {
  test("updating a news post title is visible on /bg/novini without waiting for TTL expiry", async ({
    page,
    request,
  }) => {
    // 1. Authenticate as admin
    await authenticateAdmin(request);

    // 2. Load the public news page to discover which posts are actually shown
    const publicPage = await request.get("/bg/novini");
    expect(publicPage.ok()).toBeTruthy();
    const publicHtml = await publicPage.text();

    // 3. Fetch the admin news list
    const listRes = await request.get("/api/admin/news?locale=bg");
    if (!listRes.ok()) {
      test.skip(true, `Admin news list returned ${listRes.status()} — not authenticated`);
      return;
    }
    const { posts } = await listRes.json();
    if (!posts?.length) {
      test.skip(true, "No seed news posts — run: pnpm prisma db seed");
      return;
    }

    // 4. Pick a post whose title currently appears on the public news list
    const visiblePost = posts.find(
      (p: { title: string; id: string }) =>
        typeof p.title === "string" && publicHtml.includes(p.title)
    );
    if (!visiblePost) {
      test.skip(true, "No published post found on /bg/novini — check seed data");
      return;
    }

    const originalTitle = visiblePost.title as string;
    const mutatedTitle = `${originalTitle} [e2e]`;

    // 5. Read the post to get its current markdown / blocks (PUT requires both)
    const getRes = await request.get(`/api/admin/news/${visiblePost.id}?locale=bg`);
    expect(getRes.ok()).toBeTruthy();
    const { markdown, blocks, useBlocks } = await getRes.json();
    const safeMarkdown = (typeof markdown === "string" && markdown.trim()) || "placeholder";

    // 6. Mutate via PUT (multipart)
    const putRes = await request.put(`/api/admin/news/${visiblePost.id}`, {
      multipart: {
        title: mutatedTitle,
        slug: visiblePost.id,
        locale: "bg",
        markdown: safeMarkdown,
        blocksJson: JSON.stringify(blocks ?? []),
        useBlocks: String(!!useBlocks),
        published: "true",
      },
    });
    expect(putRes.ok()).toBeTruthy();

    // 7. The public news list must reflect the new title immediately (no TTL wait)
    await page.goto("/bg/novini");
    await expect(page.getByText(mutatedTitle)).toBeVisible({ timeout: 10_000 });

    // 8. Restore the original title so the test is idempotent
    await request.put(`/api/admin/news/${visiblePost.id}`, {
      multipart: {
        title: originalTitle,
        slug: visiblePost.id,
        locale: "bg",
        markdown: safeMarkdown,
        blocksJson: JSON.stringify(blocks ?? []),
        useBlocks: String(!!useBlocks),
        published: "true",
      },
    });
  });
});
