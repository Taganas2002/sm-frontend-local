import { test, expect } from "@playwright/test";

test("login page renders in English when language=en", async ({ page }) => {
  // App language key used by `src/App.jsx`
  await page.addInitScript(() => {
    localStorage.setItem("app:language", "en");
  });

  // App uses hash routing (see links like "#/login")
  await page.goto("/#/login");
  await page.waitForURL(/#\/login/);

  // These keys are overridden in `src/translations/en.js` (stable assertion)
  await expect(page.getByText("Phone", { exact: true })).toBeVisible();
  await expect(page.getByText("Password", { exact: true })).toBeVisible();
});

