import { test, expect, type Locator } from "@playwright/test";

/**
 * Button primitive — Phase B (Figma 15:56).
 *
 * Drives the noindex /ui-preview catalog. Asserts the token bindings resolve to
 * real colours, the WCAG focus ring shows on keyboard focus, disabled is
 * colour-conveyed (opacity stays 1), and the a11y correction holds:
 * secondary/ghost label text is brand/600 (#0163b4) while the secondary border
 * stays brand/500 (#017ae0).
 */
const computed = (el: Locator) =>
  el.evaluate((node) => {
    const cs = getComputedStyle(node as HTMLElement);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      borderColor: cs.borderTopColor,
      opacity: cs.opacity,
    };
  });

test.describe("Button (Phase B)", () => {
  test("variants resolve tokens, focus ring + a11y label colours hold", async ({ page }) => {
    await page.goto("/bg/ui-preview");

    const light = page.getByTestId("matrix-light");
    const primary = light.locator("section").nth(0); // primary
    const secondary = light.locator("section").nth(1); // secondary

    // Section order per row: [0..2] Default, [3..5] Hover, [6..8] Disabled.
    const primaryDefault = primary.getByRole("button").nth(0);
    const primaryDisabled = primary.getByRole("button").nth(6);
    const secondaryDefault = secondary.getByRole("button").nth(0);

    // Primary default: brand/600 bg (AA: white-on-primary 6.1:1), white label.
    expect(await computed(primaryDefault)).toMatchObject({
      bg: "rgb(1, 99, 180)", // --color-action-primary #0163b4 (brand/600)
      color: "rgb(255, 255, 255)", // --color-text-on-brand
      opacity: "1",
    });

    // Disabled is colour-conveyed, never opacity-only.
    expect(await computed(primaryDisabled)).toMatchObject({
      bg: "rgb(228, 231, 235)", // --color-action-disabled-bg #e4e7eb
      color: "rgb(154, 165, 177)", // --color-action-disabled-text #9aa5b1
      opacity: "1",
    });

    // a11y correction: secondary label = brand/600 (6.1:1), border stays brand/500.
    expect(await computed(secondaryDefault)).toMatchObject({
      color: "rgb(1, 99, 180)", // --color-text-link #0163b4
      borderColor: "rgb(1, 122, 224)", // --color-action-secondary-border #017ae0
    });

    // Keyboard focus ring: re-focus via keyboard so :focus-visible applies,
    // then assert the shared [data-ui] 2px token outline is painted (offset 2px).
    await primaryDefault.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const focus = await primaryDefault.evaluate((node) => {
      const cs = getComputedStyle(node as HTMLElement);
      return {
        isActive: node === document.activeElement,
        focusVisible: (node as HTMLElement).matches(":focus-visible"),
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        outlineOffset: cs.outlineOffset,
      };
    });
    expect(focus.isActive).toBe(true);
    expect(focus.focusVisible).toBe(true);
    expect(focus.outlineStyle).toBe("solid");
    expect(focus.outlineWidth).toBe("2px");
    expect(focus.outlineOffset).toBe("2px");
    expect(focus.outlineColor).toBe("rgb(90, 172, 233)"); // --color-action-focus-ring #5aace9

    // Dark mode: the nested [data-theme="dark"] panel re-declares tokens.
    const darkPrimary = page.getByTestId("matrix-dark").locator("section").nth(0).getByRole("button").nth(0);
    expect(await computed(darkPrimary)).toMatchObject({
      bg: "rgb(47, 148, 228)", // dark --color-action-primary brand/400 #2f94e4
    });
  });
});
