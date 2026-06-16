import { authenticator } from "otplib";
import type { Page } from "@playwright/test";

// Matches prisma/seed.js: the bootstrap admin is 2FA-enrolled with this secret
// (mandatory 2FA for ADMIN), and these single-use recovery codes.
export const TEST_2FA_SECRET = "JBSWY3DPEHPK3PXP";
export const TEST_RECOVERY_CODES = ["aaaaa-bbbbb", "ccccc-ddddd"];

/** A fresh 6-digit TOTP for the seeded admin. */
export function currentTotp(secret = TEST_2FA_SECRET): string {
  return authenticator.generate(secret);
}

/** Fill the login form, then the 2FA step (TOTP), landing on /admin. */
export async function adminLogin(
  page: Page,
  opts: { email?: string; password?: string; secret?: string } = {},
): Promise<void> {
  const email = opts.email ?? "admin@elsys.bg";
  const password = opts.password ?? "admin123";
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // 2FA step reveals the 6 code boxes.
  await page.waitForSelector('[data-ui="twofa-digit"]');
  const code = currentTotp(opts.secret);
  const boxes = page.locator('[data-ui="twofa-digit"]');
  for (let i = 0; i < 6; i++) await boxes.nth(i).fill(code[i]);
  await page.getByRole("button", { name: "Потвърди" }).click();
  // Authenticated landing (NOT the login page).
  await page.waitForURL((u) => /^\/admin(\/|$)/.test(u.pathname) && !u.pathname.startsWith("/admin/login"));
}
