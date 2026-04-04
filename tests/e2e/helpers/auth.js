/**
 * E2E login against a running backend (prefer profile `e2e` + seeded user).
 * Uses sequential wait for dashboard so the report does not show a timed-out "error text" step on success.
 */
export async function loginAsE2EUser(page, { language = "fr" } = {}) {
  const phone = process.env.E2E_PHONE || "0555000000";
  const password = process.env.E2E_PASSWORD || "E2E-ChangeMe!2026";

  await page.addInitScript((lang) => {
    localStorage.setItem("app:language", lang);
  }, language);

  await page.goto("/#/login");
  await page.getByTestId("login-phone").fill(phone);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  const loginError = page.getByText(/Invalid phone or password/i);
  try {
    await page.waitForURL(/#\/dashboard/, { timeout: 20_000 });
  } catch {
    if (await loginError.isVisible().catch(() => false)) {
      throw new Error(
        [
          "Login failed in E2E.",
          "Start backend with SPRING_PROFILES_ACTIVE=e2e and matching E2E_PHONE/E2E_PASSWORD.",
          `Tried phone=${phone}`,
        ].join(" ")
      );
    }
    throw new Error("Login did not reach /#/dashboard. Is the backend running?");
  }
}

export function e2eCredentials() {
  return {
    phone: process.env.E2E_PHONE || "0555000000",
    password: process.env.E2E_PASSWORD || "E2E-ChangeMe!2026",
  };
}
