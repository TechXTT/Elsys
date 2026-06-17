import { test, expect } from "@playwright/test";

// News index /novini (Figma 51:3) — paginated NewsCard grid (6/page). Seed has
// 9 published posts → 2 pages.
test.describe("News index (Phase E1)", () => {
  test("paginates the news grid", async ({ page }) => {
    await page.goto("/bg/novini");

    await expect(page.locator("h1")).toBeVisible();
    const cards = page.locator('[data-ui="news-card"]');
    expect(await cards.count()).toBe(6);

    const pager = page.getByRole("navigation", { name: "Странициране на новините" });
    await expect(pager).toBeVisible();
    await expect(pager.locator('[aria-current="page"]')).toHaveText("1");

    // Page 2 shows the remaining posts and marks itself current.
    await page.goto("/bg/novini?page=2");
    const pager2 = page.getByRole("navigation", { name: "Странициране на новините" });
    await expect(pager2.locator('[aria-current="page"]')).toHaveText("2");
    expect(await page.locator('[data-ui="news-card"]').count()).toBeGreaterThanOrEqual(1);
  });
});
