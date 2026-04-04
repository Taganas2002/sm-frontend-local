import { test, expect } from "@playwright/test";

test("login works and redirects to dashboard", async ({ page }) => {
  const phone = process.env.E2E_PHONE || "0555000000";
  const password = process.env.E2E_PASSWORD || "E2E-ChangeMe!2026";

  await page.addInitScript(() => {
    localStorage.setItem("app:language", "en");
  });

  await page.goto("/#/login");
  await page.waitForURL(/#\/login/);

  await page.getByTestId("login-phone").fill(phone);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  // Successful login pushes to dashboard
  await page.waitForURL(/#\/dashboard/, { timeout: 15_000 });
  await expect(page).toHaveURL(/#\/dashboard/);
});

