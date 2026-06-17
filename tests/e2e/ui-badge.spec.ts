import { test, expect } from "@playwright/test";

// Badge primitive — Phase B (Figma 35:38). Accessible tint+ink+dot, pill radius.
test.describe("Badge (Phase B)", () => {
  test("renders tint bg + ink text + solid dot as a full-radius pill", async ({ page }) => {
    await page.goto("/bg/ui-preview");

    const section = page.getByTestId("preview-badge");
    const firstBadge = section.locator('[data-ui="badge"]').first(); // blue · sm

    const style = await firstBadge.evaluate((el) => {
      const cs = getComputedStyle(el as HTMLElement);
      const dot = (el as HTMLElement).querySelector("span");
      return {
        bg: cs.backgroundColor,
        color: cs.color,
        radius: cs.borderTopLeftRadius,
        dotBg: dot ? getComputedStyle(dot).backgroundColor : null,
      };
    });

    expect(style.bg).toBe("rgb(229, 242, 252)"); // --color-tag-tint-blue #e5f2fc
    expect(style.color).toBe("rgb(1, 76, 138)"); // --color-tag-ink-blue #014c8a
    expect(style.radius).toBe("9999px"); // --radius-full
    expect(style.dotBg).toBe("rgb(1, 122, 224)"); // --color-tag-blue #017ae0 (solid)

    // 6 colours × 2 sizes rendered in the light panel section header.
    await expect(section.locator('[data-ui="badge"]')).toHaveCount(24); // light + dark panels
  });
});
