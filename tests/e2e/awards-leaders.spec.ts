import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G2-2 types: Award + Leader — image-bearing yearly-append lists (D-10).

test.describe("Awards + Leaders (public)", () => {
  test("public /nagradi groups awards by year and hides drafts", async ({ page }) => {
    await page.goto("/bg/nagradi");
    await expect(page.getByRole("heading", { level: 1, name: "Награди" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "2025" })).toBeVisible();
    await expect(page.getByText("Златен медал, IOI 2025")).toBeVisible();
    await expect(page.getByText("Скрита награда")).toHaveCount(0);
  });

  test("public /vipuski groups alumni by class year and hides drafts", async ({ page }) => {
    await page.goto("/bg/vipuski");
    await expect(page.getByRole("heading", { level: 1, name: "Випуски" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Випуск 2020" })).toBeVisible();
    await expect(page.getByText("Елена Иванова")).toBeVisible();
    await expect(page.getByText("Скрит випускник")).toHaveCount(0);
  });
});

test.describe("Awards + Leaders (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("admin award + leader lists render seeded rows", async ({ page }) => {
    await page.goto("/admin/content/award");
    await expect(page.getByText("Златен медал, IOI 2025")).toBeVisible();
    await page.goto("/admin/content/leader");
    await expect(page.getByText("Елена Иванова")).toBeVisible();
  });
});
