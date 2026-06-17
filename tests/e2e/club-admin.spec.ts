import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// Happy-path for the Club admin slice, now on the generalized content-type
// framework (G2-2: ColorTag picker, publish aside, successor note, bulk ops).

test.describe("Club admin slice (G2-2 framework)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("club list renders and shows a seeded club", async ({ page }) => {
    await page.goto("/admin/content/club");
    await expect(page.getByRole("heading")).toContainText("Клубове");
    await expect(page.getByText("Роботика и автоматизация")).toBeVisible();
  });

  test("can create a club via the publish aside and it persists with its successor note", async ({ page }) => {
    // Unique slug per run — Club has a @@unique([slug, locale]) constraint.
    const stamp = Date.now();
    const slug = `test-klub-${stamp}`;
    const title = `Test Club E2E ${stamp}`;
    const note = `Наследник-бележка ${stamp}`;

    await page.goto("/admin/content/club/new");
    await expect(page.getByRole("heading")).toContainText("Нов — Клуб");

    await page.selectOption('select[name="locale"]', "bg");
    await page.fill('input[name="slug"]', slug);
    await page.fill('input[name="title"]', title);
    // ColorTag picker swatch (TEAL = "Тюркоазено").
    await page.getByRole("radio", { name: "Тюркоазено" }).click();
    await page.fill('textarea[name="__successorNote"]', note);
    // "Запази и публикувай" sets status=PUBLISHED and submits.
    await page.getByRole("button", { name: "Запази и публикувай" }).click();

    await page.waitForURL(/\/admin\/content\/club$/);
    await page.goto(`/admin/content/club?q=${encodeURIComponent(title)}`);
    await expect(page.getByText(title)).toBeVisible();
    // Status badge reflects PUBLISHED.
    await expect(page.getByText("Публикуван", { exact: true })).toBeVisible();

    // Re-open the record: the successor note round-tripped.
    await page.getByRole("link", { name: "Ред." }).first().click();
    await expect(page.locator('textarea[name="__successorNote"]')).toHaveValue(note);
  });
});
