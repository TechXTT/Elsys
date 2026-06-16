import { test, expect } from "@playwright/test";

// E3: Contact form (RHF + Zod + Phase-B primitives). Keyless dev → validates +
// reports success without sending.
test.describe("Contact (Phase E3)", () => {
  test("invalid submit shows Bulgarian field errors", async ({ page }) => {
    await page.goto("/bg/kontakti");
    await expect(page.getByRole("heading", { name: "Изпратете запитване" })).toBeVisible();

    await page.getByRole("button", { name: "Изпрати" }).click();
    // Zod (friendly BG) errors announced on the empty fields.
    await expect(page.getByText("Това поле е задължително.").first()).toBeVisible();
  });

  test("valid submit succeeds in keyless dev", async ({ page }) => {
    await page.goto("/bg/kontakti");

    await page.fill('#name', "Иван Петров");
    await page.fill('#email', "ivan@example.com");
    await page.selectOption('#topic', { label: "Прием" });
    await page.fill('#message', "Здравейте, имам въпрос относно приема за следващата година.");
    await page.getByRole("button", { name: "Изпрати" }).click();

    await expect(page.getByText(/Благодарим/)).toBeVisible();
  });
});
