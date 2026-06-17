import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G3-3: inline <Editable> on public pages (Figma 110:3). Admin-only affordance +
// right drawer → page Server Action. Seeded page /za-uchilishteto has a Section
// block titled "Кои сме".

test.describe("Inline editable blocks (G3-3)", () => {
  test("no edit affordance for anonymous visitors", async ({ page }) => {
    await page.goto("/bg/za-uchilishteto");
    await expect(page.locator('[data-ui="inline-edit-trigger"]')).toHaveCount(0);
  });

  test("admin edits a block inline via the drawer and it persists", async ({ page }) => {
    await login(page);
    await page.goto("/bg/za-uchilishteto");

    const trigger = page.locator('[data-ui="inline-edit-trigger"]').first();
    await expect(trigger).toBeVisible();
    await trigger.click();

    const drawer = page.getByRole("dialog", { name: "Редактиране на блок" });
    await expect(drawer).toBeVisible();
    const titleInput = drawer.getByRole("textbox").first();
    await expect(titleInput).toHaveValue("Кои сме");

    const stamp = `Кои сме ${Date.now()}`;
    await titleInput.fill(stamp);
    await drawer.getByRole("button", { name: "Запази" }).click();
    await expect(drawer).toBeHidden();

    await page.reload();
    await expect(page.getByText(stamp)).toBeVisible();

    // Revert so the deterministic fixture stays stable for other specs.
    await page.locator('[data-ui="inline-edit-trigger"]').first().click();
    const d2 = page.getByRole("dialog", { name: "Редактиране на блок" });
    await d2.getByRole("textbox").first().fill("Кои сме");
    await d2.getByRole("button", { name: "Запази" }).click();
  });
});
