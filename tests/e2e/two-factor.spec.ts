import { test, expect } from "@playwright/test";
import { authenticator } from "otplib";
import { adminLogin } from "./_helpers";

const PASS = "admin123";

async function passwordStep(page: import("@playwright/test").Page, email: string) {
  await page.goto("/admin/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
}

test.describe("Admin TOTP 2FA (G)", () => {
  test("password + valid TOTP signs in", async ({ page }) => {
    await adminLogin(page); // 2-step: password → TOTP → /admin
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test("mandatory gate: un-enrolled ADMIN is redirected to setup and blocked elsewhere", async ({ page }) => {
    await passwordStep(page, "setup-admin@elsys.bg"); // 2FA off → no code step
    await page.waitForURL(/\/admin\/security/);
    // Any other admin route bounces back to the setup page until enrolled.
    await page.goto("/admin/news");
    await expect(page).toHaveURL(/\/admin\/security/);
  });

  test("repeated wrong codes lock the account", async ({ page }) => {
    await passwordStep(page, "lockout-admin@elsys.bg");
    await page.waitForSelector('[data-ui="twofa-digit"]');
    const boxes = page.locator('[data-ui="twofa-digit"]');
    for (let attempt = 0; attempt < 6; attempt++) {
      for (let i = 0; i < 6; i++) await boxes.nth(i).fill("0"); // 000000 — wrong
      await page.getByRole("button", { name: "Потвърди" }).click();
      // onVerify resets the boxes when it finishes — wait for that so attempts
      // don't overlap (each must register a distinct failure).
      await expect(boxes.first()).toHaveValue("");
    }
    await expect(page.getByText(/Твърде много опити/)).toBeVisible();
  });

  test("a single-use recovery code signs in", async ({ page }) => {
    await passwordStep(page, "admin@elsys.bg");
    await page.waitForSelector('[data-ui="twofa-digit"]');
    await page.getByRole("button", { name: "Използвай резервен код" }).click();
    await page.fill('[data-ui="twofa-recovery"]', "aaaaa-bbbbb"); // seeded, single-use
    await page.getByRole("button", { name: "Потвърди" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test("enroll: un-enrolled admin scans, confirms, and gets recovery codes", async ({ page }) => {
    await passwordStep(page, "enroll-admin@elsys.bg");
    await page.waitForURL(/\/admin\/security/); // gated to setup

    await page.getByRole("button", { name: "Активирай 2FA" }).click();
    const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
    expect(secret.length).toBeGreaterThan(0);

    await page.fill("#confirm-code", authenticator.generate(secret));
    await page.getByRole("button", { name: "Потвърди и активирай" }).click();

    await expect(page.getByText("2FA е активна за вашия акаунт.")).toBeVisible();
    await expect(page.getByTestId("recovery-codes")).toBeVisible();

    // Cleanup so the test is re-runnable locally (CI re-seeds regardless).
    await page.fill("#reauth-pass", PASS);
    await page.getByRole("button", { name: "Деактивирай 2FA" }).click();
    await expect(page.getByText("Активирай 2FA")).toBeVisible();
  });
});
