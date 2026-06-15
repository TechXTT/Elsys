import { test, expect } from "@playwright/test";

// Home (Figma 44:3) — the "latest news" section is REAL data (getLatestNews →
// getNewsPosts, cached). Guards the flagship composition + the /novini CTA.
test.describe("Home flagship (Phase E1)", () => {
  test("renders the latest-news section from seed data + an all-news CTA", async ({ page }) => {
    await page.goto("/bg");

    const cards = page.locator('[data-ui="news-card"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);

    const allNews = page.getByRole("link", { name: "Всички новини" });
    await expect(allNews).toHaveAttribute("href", /\/bg\/novini$/);

    // Organization JSON-LD is emitted.
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((c) => c.includes("EducationalOrganization"))).toBeTruthy();
  });
});
