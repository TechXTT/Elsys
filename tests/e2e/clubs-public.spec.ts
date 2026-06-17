import { test, expect } from "@playwright/test";

// G2-2 type: Club — public /klubove from real data (ClubGrid). Admin CRUD is
// covered by club-admin.spec.ts (the framework slice).

test.describe("Clubs (public)", () => {
  test("public /klubove shows published clubs from data and hides drafts", async ({ page }) => {
    await page.goto("/bg/klubove");
    await expect(page.getByRole("heading", { level: 1, name: "Клубове" })).toBeVisible();
    await expect(page.getByText("Роботика и автоматизация")).toBeVisible();
    await expect(page.getByText("Състезателно програмиране")).toBeVisible();
    // Фотографски клуб is seeded as DRAFT — must not be public.
    await expect(page.getByText("Фотографски клуб")).toHaveCount(0);
  });
});
