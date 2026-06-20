import { test, expect } from "@playwright/test";

// E2: NewsPost.category + colorTag → NewsCard Badge chip + /novini filter.
test.describe("News category chip + filter (Phase E2)", () => {
  test("cards show category chips and the filter narrows the grid", async ({ page }) => {
    await page.goto("/bg/novini");

    // At least one category Badge renders on a card (seeded categories).
    await expect(page.locator('[data-ui="badge"]').first()).toBeVisible();

    const filter = page.getByRole("navigation", { name: "Филтър по категория" });
    await expect(filter).toBeVisible();

    const unfiltered = await page.locator('[data-ui="news-card"]').count();

    // Filter to a free-text category → fewer cards, chip marked current.
    // (The former "Събитие" free-text category was deduped into the canonical
    // relational "Събития" Page — see news-category dedup in prisma/seed.js — so
    // this asserts free-text filtering still works via an unaffected category.)
    await page.goto("/bg/novini?category=Награди");
    const filtered = page.locator('[data-ui="news-card"]');
    await expect(filtered.first()).toBeVisible();
    const filteredCount = await filtered.count();
    expect(filteredCount).toBeGreaterThanOrEqual(1);
    expect(filteredCount).toBeLessThan(unfiltered);

    const active = page.locator('[data-ui="news-filter"][aria-current="true"]');
    await expect(active).toHaveText(/Награди/);
  });

  // M2.4: a post's category can come from a linked parent Page (taxonomy).
  test("category derived from a parent Page renders as a chip and filters", async ({ page }) => {
    // Seeded post 'm24-categorized-news' links categoryPage "Събития".
    await page.goto("/bg/novini?category=Събития");
    const cards = page.locator('[data-ui="news-card"]');
    await expect(cards.first()).toBeVisible();
    await expect(page.getByText("Новина с категория-страница (M2.4)")).toBeVisible();
    const active = page.locator('[data-ui="news-filter"][aria-current="true"]');
    await expect(active).toHaveText(/Събития/);
  });
});
