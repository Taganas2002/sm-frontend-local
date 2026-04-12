# End-to-end (Playwright) — guide

Automation drives the **real SPA** against a **real API**. With the backend `e2e` profile, data goes to `data/app.e2e.db` (reset from template on startup), not mocked browser data.

## Why some fixes took time

E2E breaks for small reasons that are hard to see in reports: MUI `InputProps` overwriting `data-testid`, `Promise.race` on login making the HTML report show a false “invalid password” wait, **monthly groups with `sessionsPerMonth = 1`** being mis-classified as **PER_SESSION** until the API returned an explicit `billingModel` on each cycle row, and number formatting (`fr-FR` vs browser default) in assertions.

## What is covered today

| Area | Spec file | Notes |
|------|-----------|--------|
| Login + language | `smoke-login.spec.js`, `smoke-login-language.spec.js` | Dashboard redirect; EN UI |
| Full onboarding chain | `onboarding-school-setup.spec.js` | Class → teacher → subject → level → section → group → student → enrollment |
| Groups / billing models | `groups-billing-models.spec.js` | MONTHLY / PER_SESSION / PER_HOUR × **%** and **Fixed** teacher share; monthly includes `sessionsPerMonth` |
| Billing / payments | `billing-payment-deep.spec.js` | After **calendar + attendance** (seeded via API): pay monthly, per-session, per-hour; confirm dialog + receipt + paid status |

Shared helpers: `tests/e2e/helpers/auth.js`, `tests/e2e/helpers/api.js`.

## What is *not* “full” E2E yet

There is **no** single test that visits every screen or every edge case. Examples still mostly manual or covered only by **backend** integration tests (`README-TESTS.md` in the backend repo):

- Teacher payout **UI** (list / dialogs)
- Full **calendar** drag-and-drop and every attendance edge case
- License / trial / expiry flows
- Desktop Electron packaging

So: **strong regression coverage** on auth, master data, groups, and cashier billing — not a guarantee that the entire product is exercised.

## Run locally

### 1) Backend (`e2e` profile)

Start the API **before** `npm run e2e:smoke` (Playwright only starts Vite; login flows need the backend). From the backend repo:

```powershell
cd "path\to\sm-backend-locally"
$env:SPRING_PROFILES_ACTIVE = "e2e"
mvn spring-boot:run
```

Or: `.\run-e2e.ps1` if present. Optional: `E2E_RESET_DB=false` to keep DB between runs. Optional: `E2E_PHONE` / `E2E_PASSWORD` if you changed the seeded user.

**Important:** frontend and backend must **match** on features that changed together (e.g. `CycleDueRow.billingModel`). After pulling backend changes, rebuild/restart the API before expecting payment tests to classify **MONTHLY** cycles correctly.

### 2) Frontend + Playwright

```powershell
cd "path\to\school-desktop"
$env:E2E_PHONE = "<phone matching your e2e seed user>"   # optional
$env:E2E_PASSWORD = "<password matching your e2e seed user>"
npm run e2e:smoke
```

HTML report: `npm run e2e:report`.

Playwright starts Vite via `webServer` in `playwright.config.js`. On your machine the project uses **system Chrome** by default (`channel: "chrome"`). On **CI**, `CI=true` omits `channel` so `npx playwright install chromium` is enough.

## GitHub Actions

Workflow: `.github/workflows/e2e.yml` (in this repo).

1. Add a repository **secret**: `BACKEND_REPOSITORY` = e.g. `YourOrg/sm-backend-locally` (GitHub `owner/name` of the backend).
2. If the backend is **private** and not readable by the default `GITHUB_TOKEN`, give the workflow permission to clone it (same org settings / “Actions access”) or change the checkout step to use a PAT with `contents: read` in `token:`.

Tune the checkout `repository` line if you later **merge** both apps into one monorepo (then use a single checkout and paths instead).

The job builds `target/demo-0.0.1-SNAPSHOT.jar`, runs Spring with `SPRING_PROFILES_ACTIVE=e2e`, waits for `GET /api/actuator/health`, then runs Playwright against `npm run dev` (from Playwright’s `webServer` config).

## Backend reference

See the backend repo for `application-e2e.properties`, E2E seed user, `README-TESTS.md` (JUnit integration tests for money/teacher pay logic complementary to Playwright).
