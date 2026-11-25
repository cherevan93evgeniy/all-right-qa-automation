# Project instructions

## Stack

- Playwright Test
- TypeScript with strict mode
- Node.js
- GitHub Actions

## Architecture

- Separate UI and API tests.
- Use Page Object Model for UI interactions.
- Use fixtures for reusable setup.
- Keep test data separate from test logic.
- Avoid unnecessary abstractions.

## Testing rules

- Tests must be independent and repeatable.
- Never use hardcoded timeouts or waitForTimeout.
- Prefer stable, user-facing locators or test IDs.
- Use Playwright web-first assertions.
- Verify actual behavior, not just element visibility.
- Verify API status codes and response bodies.
- Clean up API test data created during tests.
- Never weaken assertions simply to make tests pass.
- Do not catch and suppress test failures. Keep test retries disabled during development to expose first-attempt failures.

## AI workflow

- Inspect the application before generating tests.
- Explain implementation decisions.
- Report assumptions and uncertainties.
- Run relevant tests after every change.
- Never invent test execution results.
- Ask before changing the agreed test scope.
- Write and maintain project documentation in English, regardless of the language of the request.

## Code quality

- Use descriptive test names.
- Avoid duplication and magic values.
- Follow Arrange-Act-Assert where appropriate.
- Keep code simple and readable.

## Repository guide

- Place browser specs in `tests/ui/` and import `test` from `fixtures/ui.fixture.ts`.
- Place request specs in `tests/api/`. Keep API request methods in `api/` and shared test data in `test-data/`.
- Keep page locators and interactions in `pages/` and assertions in specs.
- Store local environment settings in `.env`. Use `.env.example` to document variable names without secrets.
- Run `npm run typecheck` and the affected Playwright suite after changes.
