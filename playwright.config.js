import { defineConfig, devices } from "@playwright/test";

// Local dev: prefer Playwright’s use of the system Google Chrome (`channel: "chrome"`).
// CI (e.g. GitHub Actions): no OS Chrome → omit `channel` so `npx playwright install chromium` is used.
const desktopChrome = { ...devices["Desktop Chrome"] };
if (!process.env.CI) {
  desktopChrome.channel = process.env.PW_CHROME_CHANNEL ?? "chrome";
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // Parallelism: no `workers` key → Playwright default (~50% of logical CPU cores). Check the first line of test output ("Running N tests using M workers") or run `npx playwright test --workers=1`.
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: desktopChrome,
    },
  ],

  webServer: {
    command: "npm run dev -- --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

