import { test, expect } from "@playwright/test";

// E3: Postgres FTS search across news + pages, typed Badge results.
test.describe("Search (Phase E3)", () => {
  test("a query returns typed results with a count", async ({ page }) => {
    await page.goto("/bg/search?q=" + encodeURIComponent("олимпиада"));

    await expect(page.locator("h1")).toContainText("Търсене");
    // Result count (aria-live) + at least one result with a type Badge.
    await expect(page.getByText(/Намерени .* резултат/)).toBeVisible();
    const results = page.getByTestId("search-results").locator("> li");
    expect(await results.count()).toBeGreaterThanOrEqual(1);
    await expect(results.first().locator('[data-ui="badge"]')).toBeVisible();
  });

  test("no query shows the prompt; an unmatched query shows the empty state", async ({ page }) => {
    await page.goto("/bg/search");
    await expect(page.getByText("Въведете дума за търсене.")).toBeVisible();

    await page.goto("/bg/search?q=" + encodeURIComponent("zzqxnomatch123"));
    await expect(page.getByText(/Няма резултати/)).toBeVisible();
  });
});
