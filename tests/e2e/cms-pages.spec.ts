import { test, expect } from "@playwright/test";

// E2: CMS pages composed from blocks → Phase-D components (not title-only
// placeholders). About (54:3) and Admissions (53:3).
test.describe("CMS block pages (Phase E2)", () => {
  test("/bg/za-uchilishteto (About) renders block content", async ({ page }) => {
    await page.goto("/bg/za-uchilishteto");

    await expect(page.locator("h1")).toContainText("За училището");
    // Stats block value + Team block heading prove blocks rendered.
    await expect(page.getByText("1991").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Преподавателски екип" })).toBeVisible();
    // Not the title-only placeholder.
    await expect(page.getByText("Скоро повече информация")).toHaveCount(0);
  });

  test("/bg/priem (Admissions) renders steps + documents + CTA", async ({ page }) => {
    await page.goto("/bg/priem");

    await expect(page.locator("h1")).toContainText("Прием");
    await expect(page.getByText("Стъпки за кандидатстване")).toBeVisible();
    // DocumentList download link (download attr from DocumentRow).
    await expect(page.locator('[data-ui="document-row-download"]').first()).toBeVisible();
    await expect(page.getByText("Скоро повече информация")).toHaveCount(0);
  });
});
