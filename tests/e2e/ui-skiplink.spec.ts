import { test, expect } from "@playwright/test";

// SkipLink primitive — Phase B (Figma 19:19). Hidden until focus, then visible
// chip with the shared [data-ui] focus ring.
test.describe("SkipLink (Phase B)", () => {
  test("is hidden until focused, then visible with the token focus ring", async ({ page }) => {
    await page.goto("/bg/ui-preview");

    const skip = page.getByRole("link", { name: "Към съдържанието" });
    await expect(skip).toHaveAttribute("href", "#preview-content");

    // sr-only: clipped to a 1px box while unfocused.
    const hiddenBox = await skip.boundingBox();
    expect(hiddenBox && hiddenBox.width).toBeLessThanOrEqual(2);

    // Keyboard focus → focus:not-sr-only reveals it, [data-ui] paints the ring.
    await skip.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const focused = await skip.evaluate((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      return {
        focusVisible: (el as HTMLElement).matches(":focus-visible"),
        outlineColor: cs.outlineColor,
        outlineWidth: cs.outlineWidth,
        width: (el as HTMLElement).getBoundingClientRect().width,
      };
    });
    expect(focused.focusVisible).toBe(true);
    expect(focused.width).toBeGreaterThan(2);
    expect(focused.outlineWidth).toBe("2px");
    expect(focused.outlineColor).toBe("rgb(90, 172, 233)"); // --color-action-focus-ring #5aace9
  });
});
