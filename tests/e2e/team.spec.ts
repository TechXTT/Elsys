import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G2-2 type: TeamMember — public /ekip grid (grouped by category) + admin CRUD.

test.describe("Team (public)", () => {
  test("public /ekip groups members by category and hides drafts", async ({ page }) => {
    await page.goto("/bg/ekip");
    await expect(page.getByRole("heading", { level: 1, name: "Екип" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Ръководство" })).toBeVisible();
    await expect(page.getByText("инж. Стефан Бумбалов")).toBeVisible();
    await expect(page.getByText("Скрит преподавател")).toHaveCount(0);
  });
});

test.describe("Team (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("admin team list renders a seeded member", async ({ page }) => {
    await page.goto("/admin/content/team");
    await expect(page.getByRole("heading")).toContainText("Екип");
    await expect(page.getByText("инж. Стефан Бумбалов")).toBeVisible();
  });
});
