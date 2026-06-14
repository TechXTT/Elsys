import { test, expect } from "@playwright/test";

// SkipLink primitive — Phase B (Figma 19:19), wired as the first focusable in
// the layout (Phase C). Hidden until focus, then a visible chip with the
// shared [data-ui] focus ring, targeting the #main landmark.
test.describe("SkipLink (layout)", () => {
  test("is hidden until the first Tab, then visible with the token focus ring", async ({ page }) => {
    await page.goto("/bg/ui-preview");

    const skip = page.getByRole("link", { name: "Към съдържанието" });
    await expect(skip).toHaveAttribute("href", "#main");

    // sr-only: clipped to a 1px box while unfocused.
    const hiddenBox = await skip.boundingBox();
    expect(hiddenBox && hiddenBox.width).toBeLessThanOrEqual(2);

    // First Tab from the top of the page focuses it (keyboard → :focus-visible).
    await page.keyboard.press("Tab");
    const focused = await skip.evaluate((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      return {
        isActive: el === document.activeElement,
        focusVisible: (el as HTMLElement).matches(":focus-visible"),
        outlineColor: cs.outlineColor,
        outlineWidth: cs.outlineWidth,
        width: (el as HTMLElement).getBoundingClientRect().width,
      };
    });
    expect(focused.isActive).toBe(true);
    expect(focused.focusVisible).toBe(true);
    expect(focused.width).toBeGreaterThan(2);
    expect(focused.outlineWidth).toBe("2px");
    expect(focused.outlineColor).toBe("rgb(90, 172, 233)"); // --color-action-focus-ring #5aace9
  });
});
