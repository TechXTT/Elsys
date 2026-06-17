import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G5-2: /admin/help help center — tour launcher + seeded runbooks + article view.

test.describe("Admin help center (G5-2)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("help center shows the tour launcher and runbook cards", async ({ page }) => {
    await page.goto("/admin/help");
    await expect(page.getByRole("heading", { name: "Помощ и ръководства" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Започни обиколката" })).toBeVisible();
    await expect(page.getByText("Как да публикувам новина")).toBeVisible();
    await expect(page.getByText("Предаване в края на сезона")).toBeVisible();
  });

  test("opening a runbook renders its article", async ({ page }) => {
    await page.goto("/admin/help");
    await page.getByText("Управление на менюто").click();
    await expect(page).toHaveURL(/\/admin\/help\/manage-menu$/);
    await expect(page.getByRole("article")).toContainText("меню", { ignoreCase: true });
  });
});
