# Generation report

The original generation ran with Node.js 24.19.0 and Codex CLI 0.172.0 on Windows. Codex confirmed the existing ChatGPT login, and the generator excluded API key variables from the subprocess environment. The three accepted responses were saved as exact source bytes. All three original SHA-256 values matched when Prompt 23 began. [Demonstration index](demonstrations/README.md)

During integration, one flag had to move before the `exec` subcommand, and a non-fatal Codex JSONL error item had to be distinguished from a tool event. Stopping a Windows subprocess also required closing its captured streams. These integration attempts produced no saved candidates.

The first completed responses for the cart and sorting scenarios failed the property allowlist. A second response for each failed on an unsupported TypeScript construct. The CLI withheld those rejected sources before typechecking. The prompt refinements below produced fresh model responses. The third response for each scenario passed. The invalid-login scenario passed on its first completed response.

## Prompt refinements and regeneration

- For **BONUS-01**, the prompt exposed the list of allowed dotted members, specified the existing named-row locator, and asked for a polled exact array with the declared price and quantity. It requested plain inferred constants and inline callbacks and excluded casts, spread, and indexing.
- For **BONUS-03**, the prompt exposed the same member list and requested a literal price sequence, `products.map(product => product.price)`, and a polled collection comparison using `toEqual` and `expect.arrayContaining` with an exact count. The prompt allowed either order for equal prices and restricted the source to the same simple inferred syntax.

## Approved demonstration results

| Scenario | Input file | Generated source | Generation attempts | Static validation | Manual corrections | Execution status | Duration | SHA-256 approved and executed |
| --- | --- | --- | ---: | --- | --- | --- | ---: | --- |
| [BONUS-01](demonstrations/add-to-cart.md) | [add-to-cart.md](examples/add-to-cart.md) | [Exact source](demonstrations/add-to-cart.spec.ts.txt) | 3 | Syntax, AST, and strict TypeScript passed | No manual code corrections required. | Passed, exit 0 | 656 ms | `be5345012d0e600a089cdc740dab02759b2e505fdc17518ae2b2ccd4c7bf5abe` |
| [BONUS-02](demonstrations/invalid-login.md) | [invalid-login.md](examples/invalid-login.md) | [Exact source](demonstrations/invalid-login.spec.ts.txt) | 1 | Syntax, AST, and strict TypeScript passed | No manual code corrections required. | Passed, exit 0 | 516 ms | `d3674a000ca1c25055d6ce8b3756b009fc11edea979177799b966bada0eaf88b` |
| [BONUS-03](demonstrations/sort-by-price.md) | [sort-by-price.md](examples/sort-by-price.md) | [Original](demonstrations/sort-by-price.original.spec.ts.txt) and [executed revision](demonstrations/sort-by-price.spec.ts.txt) | 3 | Syntax, AST, and strict TypeScript passed for both | Two product names made string literals and unused import removed at reviewer request | Revised source passed, exit 0 | 534 ms | `6957223a2560e0b4b35a9ee58135f66bb20a769d5bb2884f442be14467a0471f` |

The user confirmed each filename and SHA-256 in its approval request. During review of BONUS-03 the user requested a source edit. Codex preserved the exact original with SHA-256 `9ce6c767f21b5541b72d6c87e594b7d864c428c714f48ea6eb3f069968b64371`, applied the change, and presented the diff and new hash for explicit approval. The original sort source remained unexecuted.

The existing runner staged each approved source separately and checked the staged SHA-256 before Playwright discovery. Each test passed on its first live Chromium run against SauceDemo with zero retries. The durations in the table are Playwright test durations. The individual records include whole-command timing and assertion outcomes. Byte comparisons matched each demonstration to its candidate or preserved original, and the executable versions also matched their approval records.

## Final Codex provider verification

```powershell
npm.cmd run bonus:generate -- --input bonus/examples/invalid-login.md --output prompt-23-codex-verification.spec.ts --provider codex
```

On Windows the final CLI exited 0. The adapter required the pinned CLI version and confirmed an existing ChatGPT login before actual headless `codex exec`. The allowlisted subprocess environment excluded separate API key variables. The updated JSONL parser accepted the successful turn, extracted the schema-conforming response, and saved the source after syntax, AST, and strict TypeScript verification. The ignored candidate has SHA-256 `a859a5f769ef78042fe6bad8ac0d167eff1e3ba02563a179b17a0dd6c9e50973`. Generation created no approval record and did not invoke Playwright.

## Historical Windows verification

| Check | Observed result |
| --- | --- |
| `npm.cmd run bonus:diagnostics` | 38 passed at the original generation stage. The checks covered input validation, path and junction rejection, early rejection of existing output, AST policy, virtual typechecking, malformed or empty responses, and mock nonzero exit and timeout. |
| `npm.cmd run bonus:typecheck` | Passed. |
| `npm.cmd run typecheck` | Passed. |
| `npx.cmd playwright test --project=chromium --project=api --list --reporter=list` | Exactly 10 Chromium UI and four API tests in six files. |
| Original bonus discovery | Zero tests with an empty approved directory. The current workflow requires one explicitly selected approval record. |
| Published baseline | Remote HEAD matches `116fea359c29d2981916634ab3b6735bcd7b8729`. The Chromium and API CI steps succeeded and the two report artifacts were uploaded. [GitHub Actions run](https://github.com/cherevan93evgeniy/all-right-qa-automation/actions/runs/45684063438) |

## Code review

The original review tightened bindings, matcher recognition, explicit timeouts, and Codex project discovery. Prompt 21 identified the lack of an explicit approval record and run selection, and the gap between local generation artifacts and a publishable demonstration. Prompt 22 added the approval and selection workflow, a text-only publication layout, a Codex provider interface, stronger JSONL validation, and focused checks for literal-only assertions. System-managed policy and concurrent local edits remain trust boundaries. [Security model and limits](README.md#security-model)

## Hardening verification

Prompt 22 passed both TypeScript checks and all 50 diagnostics. Mandatory discovery still listed 10 Chromium UI tests and four API tests. All three saved candidates matched their original SHA-256 values and passed static validation and strict TypeScript. The approval directory contained only its placeholder at that stage.

## Final regression and publication audit

Prompt 23 passed both TypeScript checks and all 50 diagnostics. Mandatory discovery returned exactly 10 Chromium UI tests and four API tests. One combined run with the safe summary reporter and trace capture disabled passed 14/14 in 16.4 s with exit code 0. The mandatory tests, workflow, main Playwright configuration, and dependency lockfile match baseline `116fea359c29d2981916634ab3b6735bcd7b8729`. The unchanged workflow runs the mandatory suite and needs no Codex login.

To check the quick start before publication, a clean local clone of the baseline received only the prospective commit files. It started with empty candidate and approval directories apart from their placeholders. Dependency installation and Chromium setup succeeded. Byte-preserving restoration reproduced all three demonstration hashes. The restored cart example used the same explicit human-approved hash and passed via the local approval and run commands without Codex (596 ms, exit code 0).

The publication review covered candidate imports and behavior, the JSONL and subprocess boundaries, the package scripts and lockfile, and the prospective tracked file set. Pattern checks found no credentials, authentication or session files, private keys, raw logs, machine-specific paths, or remote access mechanisms in that set. Generated files, local approvals, reports, and the extra integration candidate are ignored. The audit is bounded by the checked files and recognizable patterns. It relies on a trusted local toolchain and environment.
