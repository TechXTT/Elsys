import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G5-1: roles & permissions matrix + per-user role assignment (ADMIN only).

test.describe("Roles & permissions (G5-1)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("permission matrix and user role assignment render", async ({ page }) => {
    await page.goto("/admin/roles");
    await expect(page.getByRole("heading", { name: "Роли и права" })).toBeVisible();
    // Matrix shows role columns + a permission row.
    await expect(page.getByRole("columnheader", { name: "Учител" })).toBeVisible();
    await expect(page.getByText("Редакция на новини")).toBeVisible();
    // The seeded teacher appears in the assignment table.
    await expect(page.getByText("teacher@elsys.bg")).toBeVisible();
  });

  test("an admin can change a user's role", async ({ page }) => {
    await page.goto("/admin/roles");
    const row = page.locator("tr", { hasText: "teacher@elsys.bg" });
    const select = row.locator("select");
    await select.selectOption("STUDENT_EDITOR");
    // Wait for the server action to commit (optimistic UI updates on success).
    await expect(select).toHaveValue("STUDENT_EDITOR");
    // Persisted: reload and the new value sticks.
    await page.reload();
    const after = page.locator("tr", { hasText: "teacher@elsys.bg" }).locator("select");
    await expect(after).toHaveValue("STUDENT_EDITOR");

    // Restore to TEACHER so the fixture stays stable for re-runs.
    await after.selectOption("TEACHER");
  });
});
