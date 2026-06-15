import { test, expect } from "@playwright/test";

// News article /novini/[slug] (Figma 52:3) — renders the article + emits
// NewsArticle JSON-LD; unknown slugs 404 via not-found.
test.describe("News article (Phase E1)", () => {
  test("renders an article with NewsArticle JSON-LD", async ({ page }) => {
    await page.goto("/bg/novini");
    const firstHref = await page.locator('[data-ui="news-card"]').first().getAttribute("href");
    expect(firstHref).toMatch(/\/bg\/novini\/.+/);

    await page.goto(firstHref!);
    await expect(page.locator("article h1")).toBeVisible();

    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((c) => c.includes('"NewsArticle"'))).toBeTruthy();
  });

  test("404s on an unknown slug", async ({ page }) => {
    const res = await page.goto("/bg/novini/does-not-exist-xyz-123");
    expect(res?.status()).toBe(404);
  });
});
