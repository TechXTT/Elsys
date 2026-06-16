import { test, expect, type Page } from "@playwright/test";

// Phase F — admin CMS screens (restyled). Happy-path renders.
async function login(page: Page) {
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', process.env.TEST_ADMIN_EMAIL ?? "admin@elsys.bg");
  await page.fill('input[name="password"]', process.env.TEST_ADMIN_PASSWORD ?? "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin$/);
}

test.describe("Admin screens (Phase F)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("dashboard renders stat tiles + notes-for-successors card", async ({ page }) => {
    await page.goto("/admin");
    // Real stat tiles (labels from i18n).
    await expect(page.getByText("Общо новини")).toBeVisible();
    // Generational-turnover card.
    await expect(page.getByRole("heading", { name: "Бележки за наследници" })).toBeVisible();
  });

  test("news manager shows the status filter tabs", async ({ page }) => {
    await page.goto("/admin/news");
    const tablist = page.getByRole("tablist", { name: "Филтър по статус" });
    await expect(tablist).toBeVisible();
    // Archive tab exists and is selectable.
    const archive = tablist.getByRole("tab", { name: "Архив" });
    await expect(archive).toBeVisible();
    await archive.click();
    await expect(archive).toHaveAttribute("aria-selected", "true");
  });

  test("audit log renders the immutable table", async ({ page }) => {
    await page.goto("/admin/audit");
    await expect(page.getByRole("heading", { name: "Одит лог" })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
    // No edit/delete affordances on the immutable log.
    await expect(page.getByRole("button", { name: /Изтрий|Delete|Редактирай/ })).toHaveCount(0);
  });
});
