import { test, expect } from "@playwright/test";

test.describe("Carousel admin CRUD (Phase 2.1)", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL ?? "admin@elsys.bg");
    await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD ?? "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin$/);
  });

  test("carousel list page loads", async ({ page }) => {
    await page.goto("/admin/content/carousel");
    await expect(page.getByRole("heading")).toContainText("Карусел");
  });

  test("can create a carousel slide", async ({ page }) => {
    await page.goto("/admin/content/carousel/new");
    await expect(page.getByRole("heading")).toContainText("Нов — Слайд");

    await page.fill('input[name="title"]', "Test Slide E2E");
    await page.fill('input[name="imageDesktop"]', "https://via.placeholder.com/1366x564.jpg");
    await page.selectOption('select[name="locale"]', "bg");
    await page.selectOption('select[name="status"]', "PUBLISHED");
    await page.click('button[type="submit"]');

    // Should redirect back to list
    await page.waitForURL(/\/admin\/content\/carousel$/);
    await expect(page.getByText("Test Slide E2E")).toBeVisible();
  });
});
