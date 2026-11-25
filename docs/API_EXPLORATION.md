# Restful Booker API Exploration and Test Design

Explored on November 25, 2026, against `https://restful-booker.herokuapp.com`. A temporary Node.js probe used Playwright `APIRequestContext` and Node's strict assertions. It ran from standard input. See [Prompt 09](../AI_WORKLOG.md#prompt-09--api-exploration-and-test-design) and [the Playwright configuration](../playwright.config.ts).

## Official API documentation

Official reference `https://restful-booker.herokuapp.com/apidoc/`. Its deployed metadata is at `https://restful-booker.herokuapp.com/apidoc/api_data.json`. Append a section anchor from the table to the reference URL. The service homepage `https://restful-booker.herokuapp.com/` describes a reset to the ten seeded records every ten minutes.

| Method and URL path | Reference anchor | Documented request | Authentication | Documented status and response |
| --- | --- | --- | --- | --- |
| `POST /auth` | `#api-Auth-CreateToken` | JSON `Content-Type`. Required string fields `username` and `password`. | Credentials in the body. | `200` JSON with string `token`. |
| `POST /booking` | `#api-Booking-CreateBooking` | `Content-Type` and `Accept`. Full Booking body, all fields marked required. | None. | `200` JSON with numeric `bookingid` and nested Booking under `booking`. |
| `GET /booking/:id` | `#api-Booking-GetBooking` | `Accept`. Required `:id` labeled String. No body. | None. | `200` JSON Booking directly. |
| `PUT /booking/:id` | `#api-Booking-UpdateBooking` | `Content-Type` and `Accept`. Required `:id` labeled Number. Full Booking body, all fields marked required. | Valid token cookie or Basic Authorization. | `200` JSON Booking directly. |
| `PATCH /booking/:id` | `#api-Booking-PartialUpdateBooking` | `Content-Type` and `Accept`. Required `:id` labeled Number. Every Booking field is marked optional, including both nested date fields. | Valid token cookie or Basic Authorization. | `200` JSON with the full Booking directly. |
| `DELETE /booking/:id` | `#api-Booking-DeleteBooking` | Required `:id` labeled Number. No body or required representation header. Examples include JSON `Content-Type`. | Valid token cookie or Basic Authorization. | Example shows `201 Created` without a body. The success table is headed `200` and lists a string entry `OK` described as the default `201` response. |

| Full Booking fields | Documented JSON type | Required in POST and PUT field tables and Booking responses |
| --- | --- | --- |
| `firstname`, `lastname` | string | Both |
| `totalprice` | number | Yes |
| `depositpaid` | boolean | Yes |
| `bookingdates` | object | Yes |
| `bookingdates.checkin`, `bookingdates.checkout` | strings depicted as `YYYY-MM-DD` in JSON, labeled Date | Both |
| `additionalneeds` | string | Yes |

For create, PUT, and PATCH the header tables list `application/json` or `text/xml` for `Content-Type`. Those endpoints and GET list `application/json` or `application/xml` for `Accept`. Examples also show form encoding. The create form example omits `additionalneeds`. The create and GET examples omit the `Accept` header marked required in their tables. The six endpoint entries list success statuses only. The Booking schema states no minimum price, minimum name length, or date ordering rule.

## Documented and observed statuses

| Request | Documented status | Observed status and response |
| --- | --- | --- |
| `POST /auth`, valid credentials | `200` | `200` JSON, nonempty string `token`. |
| `POST /auth`, invalid password | Unspecified | `200` JSON, exact body `{"reason":"Bad credentials"}`. |
| `POST /booking`, valid body | `200` | `200` JSON, numeric ID and nested Booking. |
| `POST /booking`, exploratory bodies | `200` on success. Validation statuses unspecified. | `200` JSON for four variants. `500` plain text for omitted `firstname`. |
| `GET /booking/:id`, existing | `200` | `200` JSON Booking directly. |
| `GET /booking/:id`, deleted | Unspecified | `404` text `Not Found`. |
| `PUT /booking/:id`, valid token | `200` | `200` JSON Booking directly. |
| `PUT /booking/:id`, no credentials | Unspecified | `403` text `Forbidden`. |
| `PATCH /booking/:id`, valid token | `200` | `200` JSON full Booking directly. |
| `DELETE /booking/:id`, valid token | `201` in example, `200` in success table | `201` text `Created`. |
| `DELETE /booking/:id`, invalid token | Unspecified | `403` text `Forbidden`. |

## Authentication and evidence conventions

Published credentials returned a token and no `Set-Cookie` header in both sessions. The probe supplied `Cookie: token=<token>` explicitly for authenticated writes. The documented alternative is `Authorization: Basic <base64-encoded credentials>`, which was outside the live checks. Create and read worked without credentials. The unauthenticated PUT used a fresh context with an empty cookie jar and neither `Cookie` nor `Authorization`. The invalid-token DELETE used its own context with only the invalid cookie as credentials.

| Label | Explicit request headers |
| --- | --- |
| J | `Content-Type: application/json`, `Accept: application/json` |
| A | `Accept: application/json` |
| J + owner | J and `Cookie: token=[redacted]` |
| A + owner | A and `Cookie: token=[redacted]` |
| A + invalid | A and `Cookie: token=invalid-qa-token` |

JSON below means `application/json; charset=utf-8` and text means `text/plain; charset=utf-8`. `∅` denotes no request body. The tables list application headers. Playwright supplies transport headers. The valid password and issued tokens are redacted.

The **original** body is shown below. For other cases, substitute the exact surname for that case. The **replacement** body kept the same surname and changed `firstname` to `"Sam"`, `totalprice` to `219`, `depositpaid` to `false`, `bookingdates` to `{"checkin":"2027-07-03","checkout":"2027-07-09"}`, and `additionalneeds` to `"Late arrival"`.

~~~json
{
  "firstname": "Alex",
  "lastname": "QA-lifecycle-945c1580-2ab5-43cc-b120-afb8b58a366b",
  "totalprice": 125,
  "depositpaid": true,
  "bookingdates": { "checkin": "2027-06-10", "checkout": "2027-06-14" },
  "additionalneeds": "Breakfast"
}
~~~

## Positive lifecycle and PATCH probe

| # | Request | Headers | Request body | Status and type | Response body and comparison |
| --- | --- | --- | --- | --- | --- |
| 1 | `POST /auth` | J | `{"username":"admin","password":"[redacted]"}` | `200` JSON | `{"token":"[redacted]"}`, matching the documented shape. |
| 2 | `POST /booking` | J | Original | `200` JSON | `{"bookingid":5409,"booking":<original>}`, matching the documented wrapper. ID was a positive integer and every field matched. |
| 3 | `GET /booking/5409` | A | ∅ | `200` JSON | Original directly. Types and every saved field matched. |
| 4 | `PUT /booking/5409` | J + owner | Replacement | `200` JSON | Replacement directly. All values and types matched. |
| 5 | `GET /booking/5409` | A | ∅ | `200` JSON | Replacement directly. All updated values persisted. |
| 6 | `PATCH /booking/5409` | J + owner | `{"additionalneeds":"Late arrival and parking"}` | `200` JSON | Full replacement with the new `additionalneeds`. Every other field matched, consistent with the documented partial update. |
| 7 | `GET /booking/5409` | A | ∅ | `200` JSON | Full patched booking. Only `additionalneeds` differed from step 5. |
| 8 | `DELETE /booking/5409` | A + owner | ∅ | `201` text | Exact body `Created`. Status matches the documented example. |
| 9 | `GET /booking/5409` | A | ∅ | `404` text | Exact body `Not Found`. The reference omits this response. |

The PATCH probe reused the owned lifecycle record. The proposed API-01 follows the agreed authentication, create, read, replace, read, delete, and absence sequence.

## Negative scenarios

API-03 used the original body with surname `QA-unauthenticated-945c1580-2ab5-43cc-b120-afb8b58a366b`. API-04 used `QA-invalid-token-945c1580-2ab5-43cc-b120-afb8b58a366b`. Each case created its own record. The exploration token was used for authorized cleanup.

| Case | Request | Headers | Request body | Status and type | Response body and comparison |
| --- | --- | --- | --- | --- | --- |
| API-02 | `POST /auth` | J | `{"username":"admin","password":"wrong-password-prompt-09"}` | `200` JSON | Exact body `{"reason":"Bad credentials"}`. `reason` was a string and `token` was absent. The reference omits this branch. |
| API-03 | `POST /booking` | J | API-03 original | `200` JSON | `{"bookingid":5421,"booking":<API-03 original>}`. Documented wrapper and values matched. |
| API-03 | `PUT /booking/5421` | J | API-03 original with `firstname: "Changed"` and `totalprice: 300` | `403` text | Exact `Forbidden`, consistent with required authentication. The status and body are undocumented. |
| API-03 | `GET /booking/5421` | A | ∅ | `200` JSON | API-03 original. Every field and runtime type matched. |
| API-03 | `DELETE /booking/5421` | A + owner | ∅ | `201` text | `Created`, matching the documented status example. |
| API-03 | `GET /booking/5421` | A | ∅ | `404` text | `Not Found`, confirming cleanup. |
| API-04 | `POST /booking` | J | API-04 original | `200` JSON | `{"bookingid":5433,"booking":<API-04 original>}`. Documented wrapper and values matched. |
| API-04 | `DELETE /booking/5433` | A + invalid | ∅ | `403` text | Exact `Forbidden`, consistent with required authentication. The status and body are undocumented. |
| API-04 | `GET /booking/5433` | A | ∅ | `200` JSON | API-04 original. The record existed and every field and runtime type matched. |
| API-04 | `DELETE /booking/5433` | A + owner | ∅ | `201` text | `Created`, matching the documented status example. |
| API-04 | `GET /booking/5433` | A | ∅ | `404` text | `Not Found`, confirming cleanup. |

## Exploratory testing

Each test changed one field of the valid original. The independent surname marker was `QA-<label>-<run UUID>`. The initial run UUID was `945c1580-2ab5-43cc-b120-afb8b58a366b` and the confirmation UUID was `7aa56852-c631-42fe-bacc-ccfc7f15ef9d`. Every create used `POST /booking` with J. Accepted responses wrapped the ID and Booking. Each subsequent `GET /booking/<id>` used A with no body and returned `200` JSON with the Booking directly. The listed changes were the only differences from the valid data, apart from each unique surname.

| Label | Sole input change | Create result | Read result and classification |
| --- | --- | --- | --- |
| `negative-price` | `totalprice: -1` | `200` JSON, ID `5442`. | Stored `-1`. Potential issue because a booking total would normally be nonnegative. |
| `empty-firstname` | `firstname: ""` | `200` JSON, ID `5447`. | Stored the empty string. Required presence and nonempty content are separate requirements. |
| `reversed-dates` | `bookingdates.checkout: "2027-06-09"` | `200` JSON, ID `5453`. | Stored checkout before the `2027-06-10` check-in. Potential issue because a booking typically ends after check-in. |
| `missing-field` and `missing-field-confirmation` | Omit `firstname` | `500` text `Internal Server Error` twice, with no ID. | Surname lookups found no matches. Confirmed defect RB-01. |
| `wrong-price-type` and `wrong-price-type-confirmation` | `totalprice: "not-a-number"` | `200` JSON for IDs `5462` and `250`, both with `booking.totalprice: null`. | Both item reads returned `totalprice: null`. Confirmed defect RB-02 and a documented type discrepancy in the API response. |

The confirmation session first repeated lifecycle step 1 with the same status, MIME type, response shape, and lack of `Set-Cookie`. Each rejected create was followed up with `GET /booking?lastname=<exact unique surname>` using A with no body. Both lookups returned `200` JSON with exact body `[]`. The filtered endpoint served only to check for records from the two failed creates.

### Confirmed application defects

Severity estimates reflect the expected impact on a booking API. Production impact was outside this public demo investigation.

#### RB-01 — Omitting required firstname returns a server error

- **Severity** — Medium. Invalid input produces a generic server error that does not identify the missing field.
- **Environment** — Public Restful Booker, JSON over HTTPS, November 25, 2026.
- **Preconditions** — Use a fresh surname marker. Create accepts anonymous requests.
- **Steps** — Send `POST /booking` with J and the body below. Inspect the status and body. Repeat with a new marker.
- **Request body** — The first submission.

~~~json
{
  "lastname": "QA-missing-field-945c1580-2ab5-43cc-b120-afb8b58a366b",
  "totalprice": 125,
  "depositpaid": true,
  "bookingdates": { "checkin": "2027-06-10", "checkout": "2027-06-14" },
  "additionalneeds": "Breakfast"
}
~~~

- **Expected** — A client validation response in the `4xx` range identifies the missing field, and the request creates no booking. The reference marks the field required and leaves the exact error code and format unspecified.
- **Actual** — `500`, `text/plain; charset=utf-8`, exact body `Internal Server Error`, no ID. Both filtered lookups found zero matching records at lookup time.
- **Evidence and reproducibility** — Two of two submissions returned the same error. The [probe table](#exploratory-testing) identifies both requests and their lookups.

#### RB-02 — A nonnumeric price is accepted and read back as null

- **Severity** — Medium. A successful create can produce a booking without a usable total.
- **Environment** — Public Restful Booker, JSON over HTTPS, November 25, 2026.
- **Preconditions** — Use a fresh surname marker and obtain a valid token for cleanup.
- **Steps** — Send `POST /booking` with J and the body below. Read the returned ID with `GET /booking/:id`. Inspect the price in both responses and remove the owned record. Repeat with a new marker.
- **Request body** — The first submission.

~~~json
{
  "firstname": "Alex",
  "lastname": "QA-wrong-price-type-945c1580-2ab5-43cc-b120-afb8b58a366b",
  "totalprice": "not-a-number",
  "depositpaid": true,
  "bookingdates": { "checkin": "2027-06-10", "checkout": "2027-06-14" },
  "additionalneeds": "Breakfast"
}
~~~

- **Expected** — A client validation response rejects the nonnumeric input and creates no invalid record. Any successful Booking response must have a numeric `totalprice`.
- **Actual** — Both creates returned `200`, `application/json; charset=utf-8`, a numeric ID, and `booking.totalprice: null`. Both direct reads returned `200` JSON with `totalprice: null`. These responses establish the behavior visible to API consumers. The probe did not inspect database storage.
- **Evidence and reproducibility** — Two of two trials reproduced the response and subsequent read, for IDs `5462` and `250`. [Cleanup evidence](#cleanup-and-public-api-limitations)

### API contract discrepancies

DELETE returned `201` with plain text `Created`. The status conflicts with the success table and agrees with its example, which shows no body. All three published PATCH examples use `-X PUT`. The deployed endpoint accepted PATCH and persisted the partial change. The reference also omits the observed error responses and labels item IDs inconsistently. All item calls serialized observed positive integers into the URL. RB-02 violates the documented numeric response schema.

### Potential validation issues

Negative totals, empty first names, and checkout dates before check-in persisted in one trial each. Each case needs an explicit business requirement before it can become a confirmed defect or acceptance assertion.

### Expected API behavior

Valid create, read, full update, and partial update matched the documented JSON shapes. Invalid credentials yielded no token. Both denied write attempts left the records unchanged. Authorized deletion made owned records unreadable. The exact denial and missing-record responses characterize this deployment where the reference is silent.

## Cleanup and public API limitations

The probe issued 45 live requests from 14:50:41 to 14:51:39 UTC. The breakdown was 3 auth calls, 10 creates, 18 item reads, 2 PUTs, 1 PATCH, 9 DELETEs including one expected denial, and 2 filtered checks. The combined statuses were `200` × 25, `201` × 8, `403` × 2, `404` × 8, and `500` × 2.

A `finally` block handled each known ID. It required a matching surname in the latest read, or a separate read if needed, before deletion. Every cleanup request in the table had an empty body.

| Case | Owned ID | Authorized DELETE with A + owner | Following GET with A |
| --- | ---: | --- | --- |
| API-01 and PATCH | 5409 | `201` text `Created` | `404` text `Not Found` |
| API-03 | 5421 | `201` text `Created` | `404` text `Not Found` |
| API-04 | 5433 | `201` text `Created` | `404` text `Not Found` |
| Negative price | 5442 | `201` text `Created` | `404` text `Not Found` |
| Empty first name | 5447 | `201` text `Created` | `404` text `Not Found` |
| Reversed dates | 5453 | `201` text `Created` | `404` text `Not Found` |
| Wrong price type | 5462 | `201` text `Created` | `404` text `Not Found` |
| Wrong price type confirmation | 250 | `201` text `Created` | `404` text `Not Found` |

All eight known records were deleted and verified absent. Both missing-field responses lacked IDs, and both narrowly scoped surname lookups were empty. The ID drop from `5462` to `250` between sessions is consistent with the published reset. The later lookup for the first rejected submission establishes absence only at lookup time. IDs can be reused, so keep the ownership marker until teardown. A disappearance during a persistence assertion remains a failure. Evidence covers JSON and cookie authentication on the public deployment. Basic authentication, XML, form encodings, and concurrency were outside this probe.

## Original automated test design

The table records the scenario design after the initial exploration. The configured API origin must be reachable. See [current automation](#current-automation) for the implemented suite and differences from the proposal.

| Case | Preconditions and data | Steps and response contracts | Business and persistence assertions | Cleanup |
| --- | --- | --- | --- | --- |
| **API-01 — Complete booking lifecycle** | Published credentials and distinct valid original and replacement values with one ownership marker. | One independent test with sequential `test.step()` calls for auth (`200` JSON and nonempty string token), create (`200` JSON and positive integer ID with nested Booking), read (`200` JSON direct Booking), replace (`200` JSON direct Booking), read replacement (`200` JSON direct Booking), delete (`201` text `Created`), and confirm absence (`404` text `Not Found`). | Check Booking runtime types and compare the exact original or replacement at each successful response. Read the updated data independently and verify final absence. | Track the ID early, verify ownership before delete, and confirm absence. Retain fallback cleanup if an earlier step fails. |
| **API-02 — Authentication with invalid credentials** | Fresh context, published username, intentionally wrong password. | Auth returns `200`, JSON, exact body `{"reason":"Bad credentials"}`, string `reason`, and no own `token` property. | Verify that the attempted authentication grants no token. No Booking state is involved. | Playwright disposes the test-scoped context. |
| **API-03 — Update booking without authentication** | Independently created valid booking and a distinct valid PUT body. Hold cleanup credentials separately. | Create `200` JSON with positive integer ID and typed nested Booking. PUT with neither Cookie nor Authorization returns `403` text `Forbidden`. Independently GET `200` JSON direct Booking. | Verify all persisted values equal the original and the attempted changes would have changed those values. | Ownership-verified authenticated DELETE `201` text `Created` followed by GET `404` text `Not Found` in teardown. |
| **API-04 — Delete booking with invalid token** | Independently created valid booking and an explicit invalid cookie. Hold the valid cleanup token separately. | Create `200` JSON with positive integer ID and typed nested Booking. DELETE with only the invalid auth cookie returns `403` text `Forbidden`. Independently GET `200` JSON direct Booking. | Verify the record exists and deep-equals every original field. | Ownership-verified authenticated DELETE `201` text `Created` followed by GET `404` text `Not Found` in teardown. |

For successful Booking responses, assert string names, finite numeric price, boolean deposit status, a dates object with two `YYYY-MM-DD` strings, and string `additionalneeds` for the full payloads used here. Check MIME types and assert response bodies as JSON or exact text according to the observed branch. Compare all values separately from checking runtime types.

## Original architecture proposal

At the close of Prompt 09, the [configuration](../playwright.config.ts) provided an API project, API base URL, and zero retries. The API client, factory, and two specs were placeholders. The fixture directory contained the UI fixture. The table preserves that historical proposal.

| Planned file | Responsibility |
| --- | --- |
| [api/booking.client.ts](../api/booking.client.ts) | Thin methods for auth, create, read, replace, and delete using the injected `APIRequestContext`. Return `APIResponse` so specs control status, header, and body assertions. Add a PATCH method when an agreed test needs it. |
| `api/booking.types.ts` | Define `Booking`, `BookingDates`, `BookingId`, `CreateBookingResponse`, credentials, and authentication success and failure shapes. Treat parsed bodies as `unknown` until runtime checks pass. |
| `fixtures/api.fixture.ts` | Use Playwright's test-scoped `request`. A small custom fixture can share ownership-aware teardown for the three write scenarios. Resolve a valid token only for tests that need it. |
| [test-data/booking.factory.ts](../test-data/booking.factory.ts) | Generate valid data with a `randomUUID()` surname marker and deterministic date format. Preserve the marker in replacement bodies. Keep published credential defaults in API test data and allow environment overrides for other instances. |
| [tests/api/booking.spec.ts](../tests/api/booking.spec.ts) | API-01 lifecycle and state assertions. |
| [tests/api/booking-negative.spec.ts](../tests/api/booking-negative.spec.ts) | API-02 through API-04 and their response and persistence assertions. |

Pass tokens explicitly to protected requests. A call without a token supplies neither authentication header. Keep tokens and tracked bookings test-scoped, redact token values in diagnostics, and keep authenticated trace artifacts private. Reuse small runtime assertions for Booking shapes. Keep case-specific contracts in specs.

The proposal called for early ID registration and ownership verification before teardown deletion. Cleanup was intended to report an already absent record, skip deletion on a marker mismatch, and report teardown errors alongside the original scenario failure.

## Current automation

The [positive spec](../tests/api/booking.spec.ts) and [negative spec](../tests/api/booking-negative.spec.ts) implement API-01 through API-04. The client uses the configured API origin, accepts explicit tokens for protected writes, returns responses to the callers, and exposes unexpected redirects as HTTP responses. The current configuration exposes `API_BASE_URL` and uses published demo credentials. The type contracts use `number` for booking IDs. The factory generates a fresh UUID-backed surname for each new booking, and the replacement payload preserves that marker.

The [runtime assertions](../tests/api/helpers/booking.assertions.ts) register a valid positive safe-integer ID as soon as it can be extracted, before asserting the create response status, media type, and Booking fields. The registry uses the marker from the submitted payload. Each successful Booking response is compared with the expected payload. The live tests verified the text/plain media type, status, and exact text for the protected-write denials, successful deletions, and post-delete absence responses. The media type matcher accepts parameters such as charset.

The [teardown fixture](../fixtures/api.fixture.ts) first reads the ID and checks the marker. It returns early for absence and skips deletion on a mismatch. If it has to obtain a token, it validates the HTTP status, JSON media type, and nonempty string token, then reads the ID again to confirm ownership immediately before DELETE. A token supplied at registration requires only the first ownership GET. Cleanup checks DELETE and then confirms absence with a separate GET. Teardown errors are reported alongside any original test failure.

The last ownership GET and DELETE are separate operations. The API provides no atomic conditional deletion, so a reset and ID reuse between those requests can still affect another record. A create whose response does not yield a usable ID cannot be cleaned up through this registry. See [Prompt 15](../AI_WORKLOG.md#prompt-15--api-refactoring-and-final-verification) for the controlled checks and live verification.
