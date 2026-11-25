# AI Work Log

## AI Tools and Development Workflow

Codex used Playwright MCP to inspect the live SauceDemo UI before implementing tests. The browser checks covered authentication, all four sort options, cart state, checkout validation, order totals, confirmation, and return to the catalog. See [UI Exploration](docs/UI_EXPLORATION.md) for the observed routes, messages, and locators.

MCP tools used were `browser_navigate`, `browser_snapshot`, `browser_evaluate`, `browser_fill_form`, `browser_click`, `browser_select_option`, `browser_run_code_unsafe`, `browser_console_messages`, and `browser_tabs`. They supported live interactions, accessibility and DOM inspection, console review, and fresh browser sessions. The automated suite runs independently with Playwright Test.

The independent audit used two review passes. The AI Standards reviewer checked the source against [AGENTS.md](AGENTS.md). The AI Spec reviewer checked behavior against the agreed scenarios. Reviewers used the TypeScript Language Service to trace unused symbols through imports, exports, and fixtures. The implementation agent repeated those checks before deleting code. The audit found no critical issues. The final review of the changes in Prompt 08 found no issues requiring further fixes.

## Agent Instructions

- Inspect the application before writing tests. Report assumptions, evidence, and actual command results. Ask before changing the agreed test scope.
- Keep UI and API specs separate. Keep locators and actions in Page Objects, assertions in specs, and shared setup and data in fixtures and `test-data/`.
- Use strict TypeScript, independent browser contexts, stable role or test-ID locators, and web-first assertions. Check business outcomes as well as visibility.
- Preserve assertion strength. Avoid fixed sleeps, shared browser sessions, and skips that hide failures. Keep test retries disabled during development so first-attempt failures remain visible. Run type checking and the affected suite after changes.
- Write and maintain project documentation in English, regardless of the language of the request. Leave Git commits to the user unless explicitly requested.

## Key Prompts

The prompts below have been translated into English and condensed for documentation. The Prompt 04 entry summarizes the recorded implementation scope. Shared instructions appear once above. API exploration begins with Prompt 09.

### Prompt 01 — Application Exploration and POM

Continue live browser exploration from Login and Inventory through sorting, cart, and checkout. Verify routes, accessibility, `data-test` attributes, messages, and order amounts. Review the existing Page Objects and fix only evidenced issues. Record the MCP tools used, who found each issue, and the verification results. Treat the telemetry responses as observations pending analysis.

### Prompt 02 — Playwright Fixtures

Define four test-scoped Page Object fixtures with `test.extend`. Add `authenticatedPage` to sign in as `standard_user`, wait for the catalog, and yield the same `InventoryPage`. Keep Login tests unauthenticated at startup and isolate each test in its own browser context. Check types, imports, fixture dependencies, and discovery.

### Prompt 03 — Login Tests

Implement UI-01 for successful login, UI-08 for an invalid password, and UI-09 for a missing username. Verify the inventory route and six products on success. For both errors, verify the exact alert, unchanged login URL, and hidden catalog. Run the live Chromium specs and repeat each case three times.

### Prompt 04 — Inventory and Sorting Tests

In UI-02, verify six products with unique nonempty names, positive prices, and loaded images. In UI-03 and UI-04, verify ascending price and descending name. Derive expectations from the original product data and allow either order for equal prices. Reverse the test comparators to verify that the order assertions fail.

### Prompt 05 — Shopping Cart Tests

In UI-05, add Backpack and verify the button change, badge, cart URL, and exact cart row against its original catalog data. In UI-06, add Backpack and Bike Light, remove Bike Light, and check that Backpack's price and quantity remain unchanged and the badge decreases. Check sensitivity with a changed expected price and a deliberately incorrect removal. Restore the source, then run the cart specs normally, repeated, and with the existing Login and Inventory specs.

### Prompt 06 — Checkout Tests

In UI-07, carry two original catalog products through checkout, calculate the subtotal independently in cents, validate non-negative tax and the total, confirm the order, and verify that the cart clears. In UI-10, submit without a postal code and check the exact error, retained Information step, and absence of Overview and completion. Change the expected total and error text deliberately to verify sensitivity, restore the source, and run all ten live Chromium scenarios.

### Prompt 07 — Independent Code Review

Review the current sources and all ten scenarios for coverage, assertion quality, stability, TypeScript, Page Object design, and unused code. Classify findings by severity and distinguish confirmed failures from hypotheses and deliberate sensitivity checks. Verify type checking and Chromium discovery without editing the project.

### Prompt 08 — Refactoring and Verification

Add exact-name row visibility checks in UI-05, UI-06, and UI-07. Verify that the Login form remains usable in UI-08 and UI-09, and that UI-10 starts checkout with one visible Backpack. Check UI-06 count and contents in one snapshot. Recheck symbol references before removing unused code and preserve shared helpers, fixtures, data, and sort options. Reproduce the hidden-row behavior on a separate synthetic DOM. Run strict type checks, discovery, and live Chromium with one worker, two workers, and two workers with three executions per scenario.

### Prompt 09 — API Exploration and Test Design

Compare the six official Restful Booker endpoints with live JSON responses. Exercise the booking lifecycle, three authentication scenarios, and five single-field validation probes. Design API-01 through API-04 and document a minimal architecture for later implementation.

The research sub-agent read the deployed reference metadata using PowerShell. A temporary Node.js probe used Playwright `APIRequestContext` and strict assertions for 45 sequential HTTP requests. It passed tokens per request, used isolated contexts for the authorization checks, generated unique surname markers, and used ownership-checked cleanup in `finally`. All eight created records returned `201 Created` on deletion and `404 Not Found` on verification. Two filtered lookups for requests that returned no ID were empty.

The live lifecycle and both protected-write denials behaved as expected. Invalid credentials returned `200` with `{"reason":"Bad credentials"}` and no token. Omitting `firstname` returned `500` twice. A nonnumeric price returned `200` and was read back as `null` twice. Three business validation questions remain open. The reference has conflicting DELETE success statuses and PATCH examples that use PUT. Type checking passed. The API project reported its two existing skipped placeholders. See [API Exploration](docs/API_EXPLORATION.md) for the evidence, test design, and architecture proposal.

### Prompt 10 — API Client and TypeScript Contracts

Implement a thin Playwright booking client and the TypeScript contracts needed by the four planned API tests. The client accepts an injected `APIRequestContext` and uses relative paths resolved against its base URL. Its five methods return the original `APIResponse` with HTTP status errors disabled per request. This lets specs check statuses, content types, JSON, plain text, and persisted state. Exported response types describe expected bodies. Callers remain responsible for runtime checks. [Booking client](api/booking.client.ts) · [TypeScript contracts](api/booking.types.ts)

Update and delete attach a token cookie only when the caller supplies a token. The client stores no token. Use a clean request context for anonymous scenarios because Playwright can carry cookies or credentials from the injected context. Booking IDs use `number`, matching the returned IDs. The official field tables mark `additionalneeds` required and the form examples omit it. The live JSON create and PUT both succeeded with the field omitted, and the field was absent in both responses and subsequent reads. The shared `Booking` type therefore marks it optional. [Exploration reference](docs/API_EXPLORATION.md#official-api-documentation)

An in-memory Node.js diagnostic used the configured public API origin and issued 12 requests through the client. Both auth calls returned `200`. Valid credentials produced a token without a session cookie, and the invalid password produced `{"reason":"Bad credentials"}`. Create and read succeeded for owned booking `139`. PUT without authentication and DELETE with an invalid token each returned `403 Forbidden`, and a fresh GET confirmed the original data. Authenticated PUT returned `200` and its changes persisted. The `finally` block verified ownership with a fresh GET, deleted with `201 Created`, and confirmed `404 Not Found` on the subsequent GET. All diagnostic assertions passed and the script ran from standard input. A public reset can still occur between ownership verification and deletion.

`npm.cmd run typecheck` and `npx.cmd --no-install tsc --noEmit --noUnusedLocals --noUnusedParameters` passed. The API project reported the two existing skipped placeholders.

### Prompt 11 — API Fixtures and Test Data Factory

Implement the Booking factory, published demo credentials, and test-scoped API fixtures. The factory adds a UUID surname and uses deterministic values for the business fields. Overrides can replace individual dates and preserve the original surname for PUT. Each call returns a fresh object and date pair. The factory checks nonempty names, a finite positive price, and valid calendar dates with checkout after check-in. The published credentials and negative values live in one test data module. [Booking factory](test-data/booking.factory.ts) · [Demo credentials](test-data/booking.credentials.ts)

`bookingClient` wraps Playwright's built-in `request`. The client fixture does not authenticate. `getAuthToken` is a lazy function that checks HTTP 200, JSON, and a nonempty string token, and caches the promise per test. This permits the lifecycle spec to assert on its own explicit authentication response and pass that token to cleanup. Tests can omit a token or explicitly send an invalid one. Authorization is request-local. [API fixtures](fixtures/api.fixture.ts)

`bookingCleanup.register(id, lastname, token?)` records each owned ID before further creation assertions. Teardown runs while Playwright's request context is still available. A fresh GET checks the surname before deletion, and an initial 404 records that the booking is already absent. Cleanup authenticates only when a matching record needs deletion and no token was supplied. It checks `201 Created` and then `404 Not Found`. Teardown reports failures with the booking ID and operation, preserves the original test failure, and does not print response content or tokens. The public database can reset between GET and DELETE because the operations are separate. [Exploration limitations](docs/API_EXPLORATION.md#cleanup-and-public-api-limitations)

The temporary Playwright run produced three passes and two planned failures. The factory check covered unique markers, independent nested objects, frozen and partial overrides, date validation, price validation, and ownership preservation on replacement. Live fixture checks confirmed lazy authentication, distinct clients and registry state across two tests, an empty cookie jar, successful cleanup, and recognition of an explicit deletion. The intentional live assertion failure still cleaned up its booking. The local mismatch probe received only `GET /booking/42` and reported the mismatch alongside the original intentional error. Separate public GETs returned `404 Not Found` for all three owned IDs, `1069`, `1078`, and `1088`. The temporary diagnostic spec and its results were removed.

Both TypeScript checks passed. Final API discovery listed the two existing placeholders, and the API runner skipped both.

### Prompt 12 — Positive Booking Lifecycle Test

Implement API-01 as one independent Playwright test with seven sequential steps for explicit authentication, creation, original read, full update, updated read, deletion, and absence verification. It uses the existing booking client, factory, demo credentials, and cleanup fixture. [API-01 spec](tests/api/booking.spec.ts)

Authentication checks HTTP 200, the JSON content type, an object with a nonempty string token, and no failure reason. Create checks a positive safe integer ID and registers it before validating the returned booking. Booking responses are read as `unknown`, checked for their runtime field types, and compared exactly with the original or replacement request payload. Separate GETs check persistence. The replacement changes the first name, price, deposit flag, checkout date, and additional needs. A fresh GET verifies the unique surname immediately before PUT and DELETE. DELETE must return `201 Created`, and the final GET must return `404 Not Found`. Request tracing is disabled for this spec because it can record authentication bodies and cookie headers. [Observed contracts](docs/API_EXPLORATION.md#documented-and-observed-statuses)

Both TypeScript checks passed. Discovery in project `api` found one positive test. The captured live run passed once and the run with `--workers=1 --repeat-each=3` passed three times, with zero skips and zero unexpected failures. Teardown recorded that all four bookings were already absent after explicit deletion. In the deliberate sensitivity check, the original GET expected price 126 while the submitted price remained 125. The exact comparison failed at the original persistence step. Teardown deleted booking `4524` with HTTP 201 and verified HTTP 404. Independent GETs returned `404 Not Found` for all five captured IDs, `4492`, `4524`, `4545`, `4574`, and `4600`. The spec was restored byte for byte before the repeated run.

The initial reporting helper assumed every JSON suite node had child suites and failed while parsing the first run. Its test result and booking ID were unavailable, so the recorded totals and absence checks use the captured runs after the parser was corrected. Public database resets can occur between an ownership read and a write because those requests are separate. [Cleanup and public API limitations](docs/API_EXPLORATION.md#cleanup-and-public-api-limitations)

### Prompt 13 — Negative API Scenarios

Implement API-02, API-03, and API-04 as independent tests against the public Restful Booker instance. API-02 checks HTTP 200, JSON, a string reason, the exact body `{"reason":"Bad credentials"}`, and the absence of a token. API-03 and API-04 create and register separate owned bookings, then read and compare every field before the rejected request. An unauthenticated PUT and a DELETE with the explicit invalid token each return HTTP 403 and exact text `Forbidden`. Independent GETs return HTTP 200 JSON and confirm that every field and the ownership marker remain unchanged. [Negative API spec](tests/api/booking-negative.spec.ts)

The negative spec starts with an empty cookie jar and no custom headers or HTTP credentials. API-02 uses no cleanup fixture and sends no successful authentication. For API-03 and API-04, valid authentication is deferred to ownership-checked teardown, which asserts `201 Created` and then `404 Not Found`. An isolated local receiver verified that the client sent neither Cookie nor Authorization on PUT, and sent exactly the invalid token cookie without Authorization on DELETE. Test tracing is disabled for the negative spec. Shared assertions check the JSON media type, register a valid ID before booking content checks, validate runtime field types, and require strict payload equality. API-01 now imports those assertions. [Shared assertions](tests/api/helpers/booking.assertions.ts) · [Positive API spec](tests/api/booking.spec.ts)

Both TypeScript checks passed. Discovery found exactly four API tests. The ordinary negative run passed 3/3, the single-worker run with `--repeat-each=3` passed 9/9, and the full API suite passed 4/4. JSON reports for each run confirmed zero skips and zero unexpected failures. The parser handled suite nodes without child suites, and raw reports stayed in memory.

Three separate sensitivity runs changed only assertions. API-02 expected `Credentials rejected` and failed on the exact rejection body. API-03 expected price 126 and received 125 on the post-denial GET. API-04 expected 404 and received 200 on the post-denial GET. API-03 and API-04 cleaned up their records despite the intentional failures. The spec was restored byte for byte after each run. Independent GETs confirmed HTTP 404 with text `Not Found` for all 13 bookings created across the recorded runs. The public database can reset between verifying an ownership marker and performing a write. [Public API limitations](docs/API_EXPLORATION.md#cleanup-and-public-api-limitations)

### Prompt 14 — Independent API Automation Code Review

Review the current API sources against the four approved cases, Playwright and TypeScript standards, cleanup behavior, and the exploration evidence. Both compiler checks passed. Discovery listed four API scenarios in two files. The review used a local simulation to confirm that the pre-refactor cleanup could delete a replacement record if its owner changed during lazy authentication. The review identified possible token exposure in Playwright reports, missing text media-type checks, and stale documentation. Scope and independence checks passed. The review did not run live API tests. The discovery invocation used the default HTML reporter and regenerated the ignored local report.

### Prompt 15 — API Refactoring and Final Verification

Keep the 10 UI and four API scenarios. Recheck ownership immediately after obtaining a lazy cleanup token, retain the one-GET path for a supplied token, and keep teardown failures alongside any original test failure. Assert text/plain for DELETE, absence verification and authorization denials. Validate the lazy authentication response as HTTP 200 with an application/json media type and a nonempty string token. Use `maxRedirects: 0` on all five client methods. [API fixture](fixtures/api.fixture.ts) · [Booking client](api/booking.client.ts)

A loopback receiver verified the before and after request sequences for reassigned ownership, disappearance while authenticating, pre-existing absence, matching ownership, and a supplied token. It also verified that HTTP 503, a connection failure, or HTTP 302 on the repeat GET prevented DELETE, and that a non-JSON authentication response prevented deletion. With an intentional test-body failure, Playwright preserved both the original failure and the new cleanup diagnostic. The HTTP 302 was returned to the caller and the receiver saw no redirected request.

A separate loopback receiver accepted the unchanged synthetic token cookie and closed the socket. The token appeared in the original request call log, in the failing `pw:api` step, and in JSON within the HTML reporter's embedded ZIP payload. The redacted final error, default JSON reporter output, stdout, stderr, and attachments did not contain the marker in that run. After the refactor, the ordinary HTML reporter retained the same failure-path exposure. Using the [safe summary reporter](reporters/safe-summary.ts) alone on the same failure produced only a failed run status and one unexpected result, with exit code 1 and no marker in its output. At the end of Prompt 15, the existing workflow still needed to switch to the safe summary. [Current publication strategy](README.md#continuous-integration)

On November 25, 2026, both TypeScript checks passed. Discovery with `--reporter=list` listed exactly four API tests. The initial sandboxed API run failed all four cases with `connect EACCES` before receiving HTTP responses. With network access approved, the ordinary API run passed 4/4 in 6.2 s, the three-repeat single-worker run passed 12/12 in 16.9 s, the Chromium regression passed 10/10 in 5.7 s, and the combined single-worker run passed 14/14 in 13.8 s. The four successful runs recorded zero skips and zero unexpected failures. Cleanup annotations accounted for all 15 created bookings. Ten were deleted and independently verified absent by teardown. Five were deleted and verified absent inside API-01, then observed absent in teardown. The four live HTML archives had no matching credential patterns or diagnostic attachments in the inspection. The temporary probes were removed.

### Prompt 16 — GitHub Actions CI and Secure Reporting

Update the existing workflow for pushes to any branch, pull requests, and manual dispatch. Use one GitHub-hosted Ubuntu job with read-only repository access, Node.js 24 LTS, npm caching, `npm ci`, TypeScript verification, and Chromium installation with its system dependencies. Run the 10 Chromium UI cases and four API cases separately with one worker each and no retries. The API step still runs after a UI failure when the prerequisites succeeded. Neither test command suppresses its exit code. [Workflow](.github/workflows/playwright.yml)

Produce an HTML report only for the UI invocation and a JSON summary only for the API invocation. Disable traces in the CI UI invocation to keep browser network captures out of its report. The API reporter writes a fixed set of fields: test title, project, status, duration, aggregate counts, and overall status and duration. The upload steps check for the generated reports even after test failures and retain each artifact for seven days. The API artifact contains only `qa-summary.json`. [Safe summary reporter](reporters/safe-summary.ts) [Continuous integration](README.md#continuous-integration)

A local receiver observed the unchanged synthetic cookie and closed the connection. The raw call log contained the marker, and the diagnostic generated a local attachment containing the same marker. The API summary reported three diagnostic outcomes including one failed test, one passed test, and one deliberately skipped case. Playwright exited with code 1. The token, raw error, and attachment were absent from the publishable JSON and console streams. The temporary receiver, failure data, and attachment were removed.

Local verification used an isolated Windows checkout with Node.js 24.19.0. `npm ci`, the TypeScript checks, and both discovery commands passed. Discovery listed exactly 10 Chromium and four API cases. The sandbox denied access to the Chromium cache lock and to SauceDemo. With approval, Chromium installation succeeded and the final UI command passed 10/10 in 7.2 seconds. The live API safe-reporter command exited 0 and reported 4/4 passed in 5.8 seconds. Neither suite skipped a case. The API invocation left the existing UI report unchanged. The contents of the Chromium HTML archive and API JSON were inspected locally, with no matches for API credentials or raw API logs in the published paths.

PyYAML parsed the workflow without duplicate keys, and targeted checks verified the triggers, permissions, step conditions, paths, action versions, and retention. Bash parsed all five shell steps. The selected action tags and Node.js line were checked against official sources. The initial reporter draft widened the test status to a string and failed TypeScript. An explicit status union corrected it before the final checks. The repository has a configured remote and no local commit. GitHub-hosted execution, Ubuntu dependency installation, and actual artifact upload remain unverified.

### Prompt 17 — Final Project and Documentation Audit

Audit the full working tree against the assignment before publication. Both TypeScript checks passed and discovery listed 10 Chromium and four API tests. Saved Prompt 15 and 16 reports corroborated the recorded live results. The audit found that README lacked the two confirmed defect reports and an explicit scope exclusion list. It also flagged first-person review claims in the work log for confirmation. The audit left the project and Git index untouched.

### Prompt 18 — Final Documentation and Publication Readiness

Add the two evidence-backed defect reports and explicit scope exclusions to the README. Clarify the Chromium-first installation and run instructions. Check historical attribution in the five AI mistake entries and retain the available code and verification records. Remove unused package and type export metadata and align Node.js type declarations with the CI runtime.

The original `finishOrder()` body was unavailable in the reviewed project materials. The work log preserves the recorded observations and identifies the AI reviewers and verification sources. The package now locks `@types/node` 24.19.2. A clean `npm ci --offline` and both TypeScript checks passed on Node.js 24.19.0. Playwright discovered 10 Chromium and four API tests. One combined live run with the safe summary reporter passed all 14 tests in 15.9 seconds with no skips.

The publication audit reviewed 36 candidate files, checked relative Markdown links, and verified that the workflow artifact paths match the reporter outputs. The read-only `git ls-remote origin` succeeded with no advertised refs. GitHub-hosted execution and artifact upload remain unverified.

## Human Engineering Decisions

- Use the public SauceDemo `standard_user` and isolate each scenario. Explicit Login scenarios open the Login page themselves. The other scenarios request authentication through a fixture. Keep credentials, expected product names, and fictional checkout data in [test-data/](test-data/).
- Use catalog prices captured before adding items as the independent source for cart and checkout expectations. Reconcile totals in integer cents using the displayed tax and keep the tax check to a valid non-negative amount. The source and observed amounts are documented in the checkout exploration. [Checkout Overview](docs/UI_EXPLORATION.md#checkout-overview)
- Keep the approved scope at ten UI and four API scenarios. Run the suites against live SauceDemo and Restful Booker. Use controlled local diagnostics for assertion sensitivity, cleanup sequencing, and reporting behavior.

## Confirmed AI Mistakes and Corrections

The entries below identify the AI reviewers and the verification recorded in the project materials. Candidate review of the evidence, approval of individual fixes, and any hands-on verification require personal confirmation. The engineering decisions above describe the project direction recorded in the prompts.

### Mistake 1 — Order confirmation race condition

**What the AI generated.** The original `finishOrder()` returned after clicking Finish while the confirmation screen could still be rendering.

**Finding.** Codex first observed the timing in a Playwright MCP probe, and the AI Spec reviewer flagged the gap in the exploration notes. An immediate `count()` on `complete-header` returned zero in all five follow-up passes. Waiting for the heading to become visible returned one match each time. [Order Confirmation](docs/UI_EXPLORATION.md#order-confirmation)

**Why it matters.** A caller that checks for confirmation as soon as `finishOrder()` resolves could report a failed order while the success screen is still rendering.

**Original code.** The original method body was unavailable in the project files and local Git history checked in Prompt 18. The exploration notes preserve the observed click-only behavior. [Order Confirmation](docs/UI_EXPLORATION.md#order-confirmation)

**Correction.** Wait for the confirmation heading to be visible before `finishOrder()` returns.

**Corrected code** from [CheckoutPage](pages/checkout.page.ts).

```ts
async finishOrder(): Promise<void> {
  await this.finishButton.click();
  await this.successMessage.waitFor({ state: 'visible' });
}
```

**Recorded verification.** The corrected method waits on the confirmation heading after the click. The AI-assisted post-change probe used the same sequence and found one confirmation heading at `/checkout-complete.html`. [Order Confirmation](docs/UI_EXPLORATION.md#order-confirmation)

### Mistake 2 — Missing visibility assertions

**What the AI generated.** UI-05, UI-06, and UI-07 validated row counts and parsed product names, prices, and quantities. A hidden row could satisfy those assertions.

**Finding.** The AI Standards reviewer identified the false-positive risk in Prompt 07 and reproduced it with a hidden cart row in local Chromium. The old assertions established that the matching row was present in the DOM.

**Why it matters.** A UI regression could hide a product from the shopper while the cart or checkout test still passes.

**Original code** from the pre-fix UI-05 source reviewed in Prompt 07.

```ts
await expect(page).toHaveURL(/\/cart\.html$/);
await expect(cartPage.products).toHaveCount(1);
await expect.poll(
  () => cartPage.getProducts(),
  { message: 'The cart should contain the selected product at its original price and quantity one' },
).toEqual([{ name, price, quantity: 1 }]);
```

**Correction.** Add `toBeVisible()` on exact-name row locators and retain the count and business-data assertions. UI-06 checks both named rows before removal and Backpack afterward. UI-07 checks both named rows in Overview. [Cart Tests](tests/ui/cart.spec.ts) · [Checkout Tests](tests/ui/checkout.spec.ts)

**Corrected code** from UI-05 in [Cart Tests](tests/ui/cart.spec.ts).

```ts
await expect(page).toHaveURL(/\/cart\.html$/);
await expect(cartPage.products).toHaveCount(1);
await expect(cartPage.productByName(name)).toBeVisible();
await expect.poll(
  () => cartPage.getProducts(),
  { message: 'The cart should contain the selected product at its original price and quantity one' },
).toEqual([{ name, price, quantity: 1 }]);
```

**Recorded verification.** The implementation agent's Prompt 08 probe reproduced the false positive and verified the corrected visibility assertions in Cart and Checkout Overview. [Assertion sensitivity checks](#deliberate-assertion-sensitivity-checks)

### Mistake 3 — Incomplete login validation assertions

**What the AI generated.** UI-08 and UI-09 verified the exact validation alert, retained login URL, and hidden catalog. The assertions did not cover the form controls after rejection.

**Finding.** The AI Standards reviewer flagged the gap in Prompt 07. The alert, URL, and catalog checks could pass with an unusable form.

**Why it matters.** A user might be unable to correct their credentials and retry after a validation error, even though both negative login tests pass.

**Original code** from the pre-fix UI-09 source reviewed in Prompt 07.

```ts
await expect(loginPage.errorMessage).toBeVisible();
await expect(loginPage.errorMessage).toHaveText('Epic sadface: Username is required');
await expect(page).toHaveURL(loginUrl);
await expect(inventoryPage.inventoryList).toBeHidden();
```

**Correction.** Keep the error and navigation assertions. Check that the named Login form remains visible, both inputs remain visible and editable, and the Login button remains visible and enabled.

**Corrected code** from UI-09 in [Login Tests](tests/ui/login.spec.ts). UI-08 applies the same form checks with its own error message.

```ts
await expect(loginPage.errorMessage).toBeVisible();
await expect(loginPage.errorMessage).toHaveText('Epic sadface: Username is required');
await expect(page).toHaveURL(loginUrl);
await expect(loginPage.form).toBeVisible();
await expect(loginPage.usernameInput).toBeVisible();
await expect(loginPage.usernameInput).toBeEditable();
await expect(loginPage.passwordInput).toBeVisible();
await expect(loginPage.passwordInput).toBeEditable();
await expect(loginPage.loginButton).toBeVisible();
await expect(loginPage.loginButton).toBeEnabled();
await expect(inventoryPage.inventoryList).toBeHidden();
```

**Recorded verification.** Both scenarios assert the form and control state after the exact error message. UI-08 and UI-09 passed with these checks in the Prompt 08 Chromium runs. [Verification results](#verification-results)

### Mistake 4 — Unverified checkout preconditions

**What the AI generated.** UI-10 attempted to add Backpack, opened the cart, and started checkout without checking the cart contents.

**Finding.** The AI Spec reviewer flagged the unchecked setup in Prompt 07. The browser exploration recorded that an empty cart could reach Checkout Overview. [Checkout Overview](docs/UI_EXPLORATION.md#checkout-overview)

**Why it matters.** A failed add action could leave the cart empty while the test still reaches the postal-code check and passes with the wrong setup.

**Original code** from the pre-fix UI-10 source reviewed in Prompt 07.

```ts
await inventory.addProductToCart(cartProductNames.backpack);
await inventory.openCart();
await cartPage.startCheckout();
```

**Correction.** Require exactly one cart row and a visible Backpack matched by exact name before starting checkout.

**Corrected code** from UI-10 in [Checkout Tests](tests/ui/checkout.spec.ts).

```ts
await inventory.addProductToCart(cartProductNames.backpack);
await inventory.openCart();
await expect(cartPage.products).toHaveCount(1);
await expect(cartPage.productByName(cartProductNames.backpack)).toBeVisible();
await cartPage.startCheckout();
```

**Recorded verification.** Both assertions run before `startCheckout()`. UI-10 passed with the new checks in the Prompt 08 Chromium runs. [Verification results](#verification-results)

### Mistake 5 — Cleanup ownership race condition

**What the AI generated.** The original fixture checked the booking's ownership marker and then obtained a lazy authentication token when the caller had not supplied one. It sent DELETE without checking the marker again after authentication.

**Finding.** The independent AI reviewer identified the interval between the ownership GET and DELETE in Prompt 14 and reproduced reassignment locally. Prompt 15 repeated the before and after comparison with a controlled HTTP receiver.

**Why it matters.** The public database can reset and reuse the same ID during authentication. A valid DELETE can then remove another booking, and the final absence check can still pass.

**Original code.** This block followed a successful ownership GET and marker comparison.

```ts
    operation = 'Cleanup authentication';
    const cleanupToken = token ?? (await getAuthToken());
    operation = 'DELETE';
    const deletion = await client.deleteBooking(id, cleanupToken);
```

**Correction.** Obtain the token only after the initial ownership check. If the fixture had to get a token, read the ID again and verify that the booking still exists and has the same marker. Keep the single preflight GET when a token was supplied. The final GET and DELETE are separate requests. Restful Booker provides no atomic conditional delete, so a reset can still occur between them.

**Corrected code** from the [API fixture](fixtures/api.fixture.ts).

```ts
    let cleanupToken = token;
    if (cleanupToken === undefined) {
      operation = 'Cleanup authentication';
      cleanupToken = await getAuthToken();

      const recheck = await checkOwnership('Ownership recheck after authentication');
      if (recheck !== 'owned') {
        return recheck.failure;
      }
    }

    operation = 'DELETE';
    const deletion = await client.deleteBooking(id, cleanupToken);
```

**Controlled automated verification.** In the local receiver, the old fixture sent DELETE against the reassigned ID, and the corrected fixture skipped that request. Playwright reported the original intentional failure and the safe ownership-mismatch diagnostic separately. A booking that disappeared during auth and one absent at the start both skipped deletion. A matching record followed the expected DELETE and absence sequence, and the pre-supplied token case made no auth call or extra pre-delete GET. Failed repeat GETs also skipped deletion. The simulation used synthetic bookings.

**Candidate manual review.** Pending.

## Engineering Improvements

| Before | After |
| --- | --- |
| Four Page Object fixtures existed without an authenticated entry point. | `authenticatedPage` depends on `loginPage` and `inventoryPage`, waits for the inventory URL and visible list, and returns that same `InventoryPage`. Within a test, all requested Page Objects share the built-in `page`. Playwright provides a fresh browser context for each test and can reuse the browser process. [ui.fixture.ts](fixtures/ui.fixture.ts) |
| The cart link matched a prefix of an accessible name that varied with cart state. The completion heading used its heading role. Both worked in the observed UI. | The verified `shopping-cart-link` and `complete-header` test IDs target the same controls explicitly. The earlier CI retry override of two was replaced with `retries: 0`, and trace capture changed from `on-first-retry` to `retain-on-failure`. [playwright.config.ts](playwright.config.ts) |
| Catalog and Overview could read separate lists of product attributes. The Cart row reader lived inside `CartPage`. | Catalog sorting and cart checks read paired data from individual cards. Cart and Overview share a reader for name, price, and quantity and use the existing price parser. Scoped exact-name locators support assertions without duplicating selectors in specs. [cart-product.ts](pages/cart-product.ts) · [saucedemo-price.ts](pages/saucedemo-price.ts) |
| UI-06 checked the pre-removal count and unordered contents in separate reads. The Spec reviewer noted that the contents matcher by itself accepted extra rows. | One polled snapshot checks the exact count and both expected records. The visibility checks still target each row by name. [Cart Tests](tests/ui/cart.spec.ts) |
| Page Objects retained speculative getters, locators, a type re-export, and a catalog description read that no assertion used. During the independent review in Prompt 07, the Standards and primary reviewers traced the references. | Removed unused members after a fresh reference check. Inventory now uses one name-and-price summary type. The shared reader, price parser, fixtures, test data, and all sort options remain. [inventory.page.ts](pages/inventory.page.ts) |
| The README still described six placeholder specs. Both review passes compared it with the current declarations and discovery. | The Prompt 08 README recorded ten implemented UI cases, the API placeholders that existed at the time, run commands, and verified Chromium coverage. [README.md](README.md) |

### Documentation Corrections

**Overstated retry policy claim.** The AI Standards and Spec reviewers compared the configuration, project instructions, and exploration notes. They found that an earlier entry had claimed that CI retries violated repository policy. The wording was corrected. No recorded run showed a retry masking a failure. Retries are a supported runner feature. With retries enabled, Playwright classifies a test that fails on its first attempt and passes on a retry as flaky. This project disables retries during development to expose first-attempt failures and retains traces for failed attempts. Web-first assertion retries and explicit repeat runs still work independently. [Playwright test retries](https://playwright.dev/docs/test-retries)

## Verification Results

These historical results were recorded on November 25, 2026, and are grouped by implementation stage. Timings are from the original runner output.

| Stage | Recorded result |
| --- | --- |
| Prompts 01 and 02 — Exploration and fixtures | Type checking passed. UI discovery found four placeholder declarations per browser, 12 total across Chromium, Firefox, and WebKit. The UI run skipped all 12. Two temporary fixture checks passed in a single Chromium worker against an intercepted origin. The first verified the shared page and context and the login cookie. The second started without the cookie or automatic navigation. The temporary specs were removed. |
| Prompt 01 — Browser and price parser probes | Guarded reads in five browser passes returned one name and price in populated Overview and six of each in Inventory. An empty-cart Overview returned two empty arrays. A local parser probe checked five distinct catalog prices and all three Overview amounts. |
| Prompt 03 — Login Tests | Type checking passed. Live Chromium passed 3 Login cases in 4.0 s. With three executions per scenario, 9 passed in 2.9 s. |
| Prompt 04 — Inventory and Sorting Tests | Type checking passed after restoring the spec. Live Chromium passed all 6 Login and Inventory cases. With three executions per Inventory scenario, 9 passed. |
| Prompt 05 — Shopping Cart Tests | Type checking passed. Live Chromium passed 2 Cart cases in 1.4 s. With three executions per scenario, 6 passed in 2.0 s. The combined Login, Inventory, and Cart run passed 8 in 2.2 s. |
| Prompt 06 — Checkout Tests | Type checking passed. Live Chromium passed 2 Checkout cases in 2.1 s. With three executions per scenario, 6 passed in 2.4 s. The full Chromium UI run passed 10 in 2.8 s with zero skips. |
| Prompt 07 — Independent Code Review | Type checking and the unused-local and unused-parameter checks passed. Chromium discovery returned 10 distinct scenarios in four files. Runtime verification in this audit consisted of a local hidden-row probe. |
| Prompt 08 — Refactoring and Verification | Type checking and `tsc --noEmit --noUnusedLocals --noUnusedParameters` passed. Chromium discovery returned 10 distinct scenarios in four files. Live Chromium passed 10/10 with one worker in 10.7 s, 10/10 with two workers in 4.5 s, and 30/30 with two workers and `--repeat-each=3` in 13.0 s. All three live runs had zero failures and zero skips. |

The first sandboxed one-worker run in Prompt 08 reported ten failures at `LoginPage.open()` with `net::ERR_NETWORK_ACCESS_DENIED` for the public SauceDemo URL. The same command passed once network access was approved, with the source held fixed.

### Deliberate assertion sensitivity checks

| Scenario | Controlled change and observed result |
| --- | --- |
| UI-03 and UI-04 | Reversed each expected comparator while keeping the requested product sort. Both scenarios failed at the intended order assertion. |
| UI-05 and UI-06 | UI-05 expected 30.99 instead of 29.99 and failed the price comparison. UI-06 deleted Backpack instead of Bike Light and failed the check for zero Bike Light rows. One Bike Light row remained. |
| UI-07 and UI-10 | UI-07 expected 4,319 cents and received 4,318. UI-10 expected `Error: Postal Code must be supplied` and received `Error: Postal Code is required`. Both failed on the intended checks. |
| Hidden-row regression probe | The implementation agent used `page.setContent()` in local Chromium with the current Cart and Overview Page Objects. Each visible list held a hidden Backpack row with a price of $29.99 and quantity 1. Both old-style count and data checks passed while `isVisible()` returned `false`. Both new assertions returned `Expected: visible` and `Received: hidden`. After removing `hidden`, both visibility checks passed. The probe ran in memory, with no diagnostic files or additions to the suite. |

The scenario mutations were intentional and the specs were restored byte for byte before the reported verification runs. Playwright traces confirmed the deliberate Cart and Checkout failures.

## Known Limitations

- Prompts 06 and 08 verified the full suite against the public SauceDemo site in Chromium. Firefox and WebKit are configured. Their recorded placeholder discovery and skips establish runner configuration only. Prompt 15 verified the four completed API specs and the combined Chromium and API run.
- Codex observed that immediate `allTextContents()` after Continue could return empty results before Overview rendered. The current readers wait for list visibility. The specs separately assert expected rows or poll their data. Monetary labels are read separately from product rows, so a delayed label update remains a potential timing risk. The recorded runs did not reproduce that failure.
- MCP recorded four telemetry `401 Unauthorized` responses from `events.backtrace.io` in one session and six in a follow-up. Cause and functional impact were unverified. A reused MCP browser context also timed out waiting for Inventory. A fresh isolated context signed in successfully, and the reused-tab behavior remains unexplained.
- The live suite depends on network access to SauceDemo. Node emitted a `FORCE_COLOR` and `NO_COLOR` precedence warning in recorded runs without affecting their outcomes.
