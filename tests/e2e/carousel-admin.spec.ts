import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

test.describe("Carousel admin CRUD (Phase 2.1)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("carousel list page loads", async ({ page }) => {
    await page.goto("/admin/content/carousel");
    await expect(page.getByRole("heading")).toContainText("Карусел");
  });

  test("can create a carousel slide and it persists in the list", async ({ page }) => {
    const title = `Test Slide E2E ${Date.now()}`;

    await page.goto("/admin/content/carousel/new");
    await expect(page.getByRole("heading")).toContainText("Нов — Слайд");

    await page.selectOption('select[name="locale"]', "bg");
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="imageDesktop"]', "https://via.placeholder.com/1366x564.jpg");
    await page.selectOption('select[name="status"]', "PUBLISHED");
    await page.click('button[type="submit"]');

    // Redirect back to the list, then search for the unique title so it's found
    // regardless of dev-DB accumulation (the list paginates at 20). Hermetic.
    await page.waitForURL(/\/admin\/content\/carousel$/);
    await page.goto(`/admin/content/carousel?q=${encodeURIComponent(title)}`);
    await expect(page.getByText(title)).toBeVisible();
  });
});
