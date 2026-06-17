import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G2-2 type: Partner — public /partnyori strip + admin CRUD.

test.describe("Partners (public)", () => {
  test("public /partnyori shows published partners and hides drafts", async ({ page }) => {
    await page.goto("/bg/partnyori");
    await expect(page.getByRole("heading", { level: 1, name: "Партньори" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Технически университет – София" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Скрит партньор" })).toHaveCount(0);
  });
});

test.describe("Partners (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("admin partner list renders a seeded partner", async ({ page }) => {
    await page.goto("/admin/content/partner");
    await expect(page.getByRole("heading")).toContainText("Партньори");
    await expect(page.getByText("Технически университет – София")).toBeVisible();
  });
});
