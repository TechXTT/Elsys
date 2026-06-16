import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// Happy-path for the Club admin slice (Phase 2.3 — admin only; public ClubGrid/route is M2.3).

test.describe("Club admin slice (Phase 2.3)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("club list renders and shows a seeded club", async ({ page }) => {
    await page.goto("/admin/content/club");
    await expect(page.getByRole("heading")).toContainText("Клубове");
    await expect(page.getByText("Роботика и автоматизация")).toBeVisible();
  });

  test("can create a club and it persists in the list", async ({ page }) => {
    // Unique slug per run — Club has a @@unique([slug, locale]) constraint.
    const stamp = Date.now();
    const slug = `test-klub-${stamp}`;
    const title = `Test Club E2E ${stamp}`;

    await page.goto("/admin/content/club/new");
    await expect(page.getByRole("heading")).toContainText("Нов — Клуб");

    await page.selectOption('select[name="locale"]', "bg");
    await page.fill('input[name="slug"]', slug);
    await page.fill('input[name="title"]', title);
    await page.selectOption('select[name="color"]', "TEAL");
    await page.selectOption('select[name="status"]', "PUBLISHED");
    await page.click('button[type="submit"]');

    // Redirect back to the list, then search for the unique title so the
    // just-created club is found regardless of dev-DB accumulation (the list
    // paginates at 20). Hermetic.
    await page.waitForURL(/\/admin\/content\/club$/);
    await page.goto(`/admin/content/club?q=${encodeURIComponent(title)}`);
    await expect(page.getByText(title)).toBeVisible();
  });
});
