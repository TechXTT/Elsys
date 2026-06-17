import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G2-2 type: Project — canonical /evroproekti list + admin CRUD.

test.describe("Projects (public)", () => {
  test("public /evroproekti shows published projects and hides drafts", async ({ page }) => {
    await page.goto("/bg/evroproekti");
    await expect(page.getByRole("heading", { level: 1, name: "Проекти" })).toBeVisible();
    await expect(page.getByText("Дигитални умения (Еразъм+)")).toBeVisible();
    await expect(page.getByText("Скрит проект")).toHaveCount(0);
  });

  test("/proekti 308-redirects to the canonical /evroproekti", async ({ page }) => {
    await page.goto("/bg/proekti");
    await expect(page).toHaveURL(/\/bg\/evroproekti$/);
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
