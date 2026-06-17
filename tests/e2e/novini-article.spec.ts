import { test, expect } from "@playwright/test";

// News article /novini/[slug] (Figma 52:3) — renders the article + emits
// NewsArticle JSON-LD; unknown slugs 404 via not-found.
test.describe("News article (Phase E1)", () => {
  test("renders an article with NewsArticle JSON-LD", async ({ page }) => {
    // Use a stable seeded article (not the "first card") so the test is robust
    // to other posts created during the suite run.
    await page.goto("/bg/novini/m24-categorized-news");
    await expect(page.locator("article h1")).toBeVisible();

    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((c) => c.includes('"NewsArticle"'))).toBeTruthy();
  });

  test("404s on an unknown slug", async ({ page }) => {
    const res = await page.goto("/bg/novini/does-not-exist-xyz-123");
    expect(res?.status()).toBe(404);
  });
});
