import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// G2-2 type: Gallery — public /galeria from real data + lightbox + admin CRUD.

test.describe("Gallery (public)", () => {
  test("public /galeria shows published items and opens a lightbox; hides drafts", async ({ page }) => {
    await page.goto("/bg/galeria");
    await expect(page.getByRole("heading", { level: 1, name: "Галерия" })).toBeVisible();
    await expect(page.getByText("Робофест 2026")).toBeVisible();
    await expect(page.getByText("Чернова снимка (скрита)")).toHaveCount(0);

    // Clicking a tile opens the lightbox dialog.
    await page.getByRole("button", { name: /Робофест 2026/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Close it.
    await page.getByRole("button", { name: "Затвори" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("album filter narrows the grid", async ({ page }) => {
    await page.goto("/bg/galeria?album=olimpiadi");
    await expect(page.getByText("Национална олимпиада")).toBeVisible();
    await expect(page.getByText("Робофест 2026")).toHaveCount(0);
  });
});

test.describe("Gallery (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("admin gallery list renders a seeded item", async ({ page }) => {
    await page.goto("/admin/content/gallery");
    await expect(page.getByRole("heading")).toContainText("Галерии");
    await expect(page.getByText("Робофест 2026")).toBeVisible();
  });
});
