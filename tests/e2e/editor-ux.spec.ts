import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G3-2: editor UX — autosave + crash recovery in the Simple Mode editor.

test.describe("Editor UX (G3-2)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("a typed draft is recovered after a reload (localStorage autosave)", async ({ page }) => {
    const title = `Чернова за възстановяване ${Date.now()}`;
    await page.goto("/admin/news/simple");
    await page.fill('input[name="title"]', title);

    // Local autosave fires 5s after the last edit; wait it out.
    await page.waitForTimeout(6000);
    await expect(page.getByText("✓ Автозапазено")).toBeVisible();

    // Reload → crash-recovery banner offers to restore the draft.
    await page.reload();
    await expect(page.getByText("Намерена е незапазена чернова. Да я възстановим ли?")).toBeVisible();
    await page.getByRole("button", { name: "Възстанови" }).click();
    await expect(page.locator('input[name="title"]')).toHaveValue(title);
  });
});
