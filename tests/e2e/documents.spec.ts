import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G2-2 type: Document — public /dokumenti from real data + admin CRUD slice.

test.describe("Documents (public)", () => {
  test("public /dokumenti lists published documents grouped by category, hides drafts", async ({ page }) => {
    await page.goto("/bg/dokumenti");
    await expect(page.getByRole("heading", { level: 1, name: "Документи" })).toBeVisible();
    await expect(page.getByText("Правилник за вътрешния ред")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Правилници" })).toBeVisible();
    // Draft document must not appear publicly.
    await expect(page.getByText("Чернова документ (скрит)")).toHaveCount(0);
  });
});

test.describe("Documents (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("admin document list renders a seeded document", async ({ page }) => {
    await page.goto("/admin/content/document");
    await expect(page.getByRole("heading")).toContainText("Документи");
    await expect(page.getByText("Правилник за вътрешния ред")).toBeVisible();
  });
});
