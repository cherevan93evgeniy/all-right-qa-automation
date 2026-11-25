# all-right-qa-automation

This repository contains 10 automated UI scenarios for SauceDemo and four automated API scenarios for Restful Booker. Both suites use Playwright Test, strict TypeScript, and Node.js.

## Setup

Use Node.js 24 LTS to match CI. The following commands install dependencies and Chromium, then run the 10 Chromium UI tests and four API tests with one worker.

```sh
npm ci
npx playwright install chromium
npx playwright test --project=chromium --project=api --workers=1
```

On Windows PowerShell, `npm.cmd` and `npx.cmd` are available if execution policy blocks the PowerShell shims. On Linux, use `npx playwright install --with-deps chromium` when Chromium system dependencies are missing. CI uses that command on Ubuntu.

Before running `npm test` or `npm run test:ui`, use `npx playwright install` to install Chromium, Firefox, and WebKit. On Linux, use `npx playwright install --with-deps` if you also need the system dependencies. API-only runs require no browser installation. Live runs need network access to the configured UI or API origin.

### Environment variables

The configuration reads an optional `.env` file. Use [the environment template](.env.example) to override these defaults.

| Variable | Default | Used by |
| --- | --- | --- |
| `UI_BASE_URL` | `https://www.saucedemo.com` | Chromium, Firefox, and WebKit projects |
| `API_BASE_URL` | `https://restful-booker.herokuapp.com` | Booking API project |

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run all configured browser and API projects |
| `npm run test:ui` | Run the UI specs in Chromium, Firefox, and WebKit |
| `npx playwright test tests/ui --project=chromium --workers=1` | Run the verified Chromium suite sequentially |
| `npm run test:api` | Run the four Restful Booker API scenarios |
| `npx playwright test --project=chromium --project=api --list --reporter=list` | List the 14 tests selected by the setup command |
| `npm run typecheck` | Type-check the project with `tsc --noEmit` |

## Continuous Integration

The [GitHub Actions workflow](.github/workflows/playwright.yml) runs on pushes to any branch, pull requests, and manual dispatches from the Actions tab when the workflow is available on the default branch. One GitHub-hosted Ubuntu job selects Node.js 24 LTS, caches npm downloads using the lockfile, installs the locked dependencies with `npm ci`, checks TypeScript, and installs Chromium with its Ubuntu system dependencies.

CI runs 14 tests in two Playwright invocations with one worker each. The `chromium` project runs 10 UI tests and the `api` project runs four Restful Booker tests. The API invocation can run after a UI or Chromium installation failure if TypeScript passed and the job is still active. A failed test makes the job fail. Firefox and WebKit remain available for local runs.

| Artifact | Uploaded path | Contents |
| --- | --- | --- |
| `ui-playwright-report` | `playwright-report/` | Playwright HTML report with UI results and failure details |
| `api-test-summary` | `qa-summary.json` | Overall status and duration, outcome counts, and the title, project, status, and duration of each API test |

Both artifacts are retained for seven days. If a report exists, the workflow can upload it after a failed run as well as after a successful one. In GitHub, open **Actions**, select the **Playwright Tests** run, and download the artifact under **Artifacts**. Extract the archive and open `index.html` for UI or `qa-summary.json` for API. [GitHub artifact download instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)

The API invocation uses only the [safe summary reporter](reporters/safe-summary.ts). It writes an allowlisted JSON file without API errors, headers, call logs, or attachments. Playwright can retain a token in nested API steps in an HTML report even when API tracing is disabled. The workflow therefore publishes the HTML report produced by the UI invocation and the standalone API summary. CI also disables UI traces so the published HTML does not package browser network captures. Keep any locally generated raw API reports private.

Both suites depend on public services. Restful Booker resets its shared database periodically, and availability or resets can fail a run. CI runs API scenarios sequentially and keeps retries disabled. The workflow and its artifact contents have been verified locally. A GitHub-hosted execution has yet to be verified.

To produce the same API summary locally, run:

```sh
npx playwright test tests/api --project=api --workers=1 --reporter=./reporters/safe-summary.ts
```

For local UI runs, Playwright writes HTML to `playwright-report/` by default. Open it with `npx playwright show-report`. UI traces are retained on failure.

## UI scenarios

| ID | Scenario |
| --- | --- |
| UI-01 | Sign in with valid credentials and verify that the six-product catalog opens. |
| UI-02 | Verify the catalog's product names, prices, and loaded images. |
| UI-03 | Sort by ascending price and verify the original product data. |
| UI-04 | Sort by descending name and verify the original product data. |
| UI-05 | Add a product and verify the cart badge and the contents of the visible row. |
| UI-06 | Remove the selected product and confirm that the other item remains unchanged. |
| UI-07 | Complete checkout for two products, reconcile the order totals, and verify that the cart clears. |
| UI-08 | Reject an invalid password and keep the Login form usable. |
| UI-09 | Require a username and keep the Login form usable. |
| UI-10 | Require a postal code before proceeding from a cart with one verified product. |

## Verified browser coverage

Chromium is the verified browser. The recorded live runs passed all 10 UI tests, including 30 executions across three repetitions. Firefox and WebKit are configured and have yet to be verified through live execution. [Verification results](AI_WORKLOG.md#verification-results)

## API scenarios

| ID | Scenario |
| --- | --- |
| API-01 | Authenticate, create and read a booking, replace its data, verify persistence, delete it, and confirm absence. |
| API-02 | Reject invalid credentials with the exact JSON failure response and no token. |
| API-03 | Deny an anonymous update and verify that all persisted fields remain unchanged. |
| API-04 | Deny deletion with an invalid token and verify that the booking remains present and unchanged. |

Prompt 15 recorded four passing API tests in the ordinary run and 12 passing executions in the three-repeat run, with zero skips or unexpected failures in either run. Authenticated cleanup checks the unique ownership marker before deletion. A public database reset can still occur between the final GET and DELETE. [API evidence](docs/API_EXPLORATION.md#current-automation) · [Verification record](AI_WORKLOG.md#prompt-15--api-refactoring-and-final-verification)

## Out of Scope

- **UI** — Name A to Z and price high to low sorting, SauceDemo user profiles beyond `standard_user`, and extended checkout validation such as missing first or last name.
- **API** — Additional payload validation scenarios, automated PATCH coverage, Basic Auth, XML and form encoding, and concurrent requests.
- **Nonfunctional** — Performance and load testing and extended security testing.

Confirmed application defects are documented below. The main suite contains no intentionally failing tests for these defects.

## Known Application Defects

### RB-01 — Missing required firstname causes HTTP 500

- **Severity** — Medium
- **Environment** — Public Restful Booker, JSON over HTTPS, observed November 25, 2026.
- **Endpoint** — `POST https://restful-booker.herokuapp.com/booking`
- **Steps** — Send the JSON below with `Content-Type: application/json` and `Accept: application/json`. Inspect the response. Repeat with a fresh surname marker.

```json
{
  "lastname": "QA-missing-field-945c1580-2ab5-43cc-b120-afb8b58a366b",
  "totalprice": 125,
  "depositpaid": true,
  "bookingdates": { "checkin": "2027-06-10", "checkout": "2027-06-14" },
  "additionalneeds": "Breakfast"
}
```

- **Expected** — A controlled client validation error (`4xx`) identifies the missing `firstname` and creates no booking. The API reference leaves the exact error status unspecified.
- **Actual** — HTTP `500`, plain text `Internal Server Error`, and no booking ID. The follow-up surname lookups found no matching records at lookup time.
- **Reproducibility** — 2/2. [Detailed evidence](docs/API_EXPLORATION.md#rb-01--omitting-required-firstname-returns-a-server-error)

### RB-02 — Invalid totalprice is accepted and returned as null

- **Severity** — Medium
- **Environment** — Public Restful Booker, JSON over HTTPS, observed November 25, 2026.
- **Endpoints** — `POST https://restful-booker.herokuapp.com/booking` and `GET /booking/:id` on the same host.
- **Steps** — Send the JSON below with `Content-Type: application/json` and `Accept: application/json`. Inspect the price in the response. Read the returned ID with `GET /booking/:id` and `Accept: application/json`. Repeat with a fresh surname marker. Use an authenticated DELETE after verifying the marker and confirm absence with a final GET.

```json
{
  "firstname": "Alex",
  "lastname": "QA-wrong-price-type-945c1580-2ab5-43cc-b120-afb8b58a366b",
  "totalprice": "not-a-number",
  "depositpaid": true,
  "bookingdates": { "checkin": "2027-06-10", "checkout": "2027-06-14" },
  "additionalneeds": "Breakfast"
}
```

- **Expected** — Client validation rejects the nonnumeric price and creates no invalid booking. Successful booking responses must contain a numeric `totalprice`.
- **Actual** — POST returned HTTP `200` with a booking ID and `booking.totalprice: null`.
- **Read-back verification** — Both later GETs returned HTTP `200` with `totalprice: null`. The evidence covers API responses only. Authenticated cleanup deleted both owned records with HTTP `201` and verified absence with HTTP `404`.
- **Reproducibility** — 2/2. [Detailed evidence](docs/API_EXPLORATION.md#rb-02--a-nonnumeric-price-is-accepted-and-read-back-as-null) · [Cleanup evidence](docs/API_EXPLORATION.md#cleanup-and-public-api-limitations)

## AI-assisted development

Playwright MCP supported historical browser exploration. The automated suite runs with Playwright Test and requires no MCP connection. The AI work log records prompts, AI-assisted findings, engineering decisions, and verification evidence. [AI work log](AI_WORKLOG.md) · [UI exploration](docs/UI_EXPLORATION.md)

## Project layout

| Path | Purpose |
| --- | --- |
| [Page Objects](pages/) | Login, catalog, cart, and checkout interactions, plus the shared row reader and price parser |
| [Fixtures](fixtures/) | Test-scoped Page Objects, authenticated UI setup, Booking client, lazy API authentication, and ownership-aware cleanup |
| [UI specs](tests/ui/) | Ten scenarios across four files |
| [API specs](tests/api/) | Four booking scenarios and shared runtime assertions for HTTP responses |
| [API client](api/) | Request methods, TypeScript contracts, and media-type matchers |
| [Test data](test-data/) | Demo credentials, UI data, and a Booking factory with unique ownership markers |
| [Reporters](reporters/) | API summary with allowlisted per-test results and aggregate counts |
| [Playwright configuration](playwright.config.ts) | Project selection, base URLs, reporters, traces, and retry settings |
