import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G5-3: /admin/handover succession checklist (ADMIN-only) wired to real state.

test.describe("Handover (G5-3)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("renders the stepped checklist + receives-access aside", async ({ page }) => {
    await page.goto("/admin/handover");
    await expect(page.getByRole("heading", { name: "Предаване на достъп" })).toBeVisible();
    await expect(page.getByText("Добави новия администратор")).toBeVisible();
    await expect(page.getByText("Експортирай одит лога")).toBeVisible();
    await expect(page.getByText("Получава достъпа")).toBeVisible();
  });

  test("completing the handover is audited", async ({ page }) => {
    await page.goto("/admin/handover");
    await page.locator('[data-ui="handover-complete"]').click();
    await expect(page.getByRole("status")).toContainText("Одит лога");
  });
});
