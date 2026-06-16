import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// Happy-path for the Media Library (G2-1, Figma 89:2). Admin-only; relies on the
// seeded media assets (olimpiada.jpg = alt OK + consent; ekip-nov.jpg = alt missing).

test.describe("Media Library (G2-1)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("renders folders, grid and a seeded asset's alt state", async ({ page }) => {
    await page.goto("/admin/media");
    await expect(page.getByRole("heading", { name: /Медийна библиотека|Media Library/ })).toBeVisible();

    // Folder rail with an "All" entry.
    await expect(page.getByRole("button", { name: /Всички|All/ })).toBeVisible();

    // Seeded assets visible in the grid.
    await expect(page.getByText("olimpiada.jpg")).toBeVisible();
    await expect(page.getByText("ekip-nov.jpg")).toBeVisible();
  });

  test("selecting an asset opens the details panel with its alt text", async ({ page }) => {
    await page.goto("/admin/media");
    await page.getByText("olimpiada.jpg").click();

    // Details panel shows the alt-text field populated from the seed.
    const altInput = page.locator('input[value="Ученици на олимпиада по информатика"]');
    await expect(altInput).toBeVisible();
  });
});
