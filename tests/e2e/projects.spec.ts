import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G2-2 type: Project — public /proekti list + admin CRUD.

test.describe("Projects (public)", () => {
  test("public /proekti shows published projects and hides drafts", async ({ page }) => {
    await page.goto("/bg/proekti");
    await expect(page.getByRole("heading", { level: 1, name: "Проекти" })).toBeVisible();
    await expect(page.getByText("Дигитални умения (Еразъм+)")).toBeVisible();
    await expect(page.getByText("Скрит проект")).toHaveCount(0);
  });
});

test.describe("Projects (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("admin project list renders a seeded project", async ({ page }) => {
    await page.goto("/admin/content/project");
    await expect(page.getByRole("heading")).toContainText("Проекти");
    await expect(page.getByText("Дигитални умения (Еразъм+)")).toBeVisible();
  });
});
