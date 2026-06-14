import { test, expect } from "@playwright/test";

// Form primitives — Phase B (Figma 17:10 / 18:2). RHF + Zod + Bulgarian errors.
test.describe("Form primitives (Phase B)", () => {
  test("default control is token-styled; empty submit shows announced BG errors", async ({ page }) => {
    await page.goto("/bg/ui-preview");

    const form = page.getByTestId("preview-form");
    const name = form.locator("#demo-name");

    // Default state: surface bg, default border.
    expect(
      await name.evaluate((el) => {
        const cs = getComputedStyle(el as HTMLElement);
        return { bg: cs.backgroundColor, border: cs.borderTopColor };
      }),
    ).toMatchObject({
      bg: "rgb(255, 255, 255)", // --color-bg-surface
      border: "rgb(228, 231, 235)", // --color-border-default #e4e7eb
    });

    // Submit empty → Zod fails, friendly Bulgarian errors appear and are announced.
    await form.getByRole("button", { name: "Изпрати" }).click();

    const alerts = form.getByRole("alert");
    await expect(alerts.first()).toBeVisible();
    expect(await alerts.count()).toBeGreaterThanOrEqual(3);
    await expect(form.getByText("Това поле е задължително.").first()).toBeVisible();

    // Error pairs colour with the announced text, and the control is aria-invalid.
    await expect(name).toHaveAttribute("aria-invalid", "true");
    // transition-colors animates the border; poll until it settles on danger.
    await expect
      .poll(() => name.evaluate((el) => getComputedStyle(el as HTMLElement).borderTopColor))
      .toBe("rgb(140, 40, 25)"); // --color-status-danger-text #8c2819
  });
});
