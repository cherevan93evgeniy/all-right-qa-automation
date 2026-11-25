# Secure AI test case generator

Turn a short SauceDemo scenario into one Playwright TypeScript candidate. The generator reuses the project's UI fixture, Page Objects, and test data. Generation and execution are separate commands. This project lives under `bonus/` and is outside mandatory test discovery.

## Quick start

From Windows PowerShell with Node.js 24 LTS installed, clone the repository and check out a revision containing the bonus files.

```powershell
git clone https://github.com/cherevan93evgeniy/all-right-qa-automation.git
Set-Location all-right-qa-automation
npm.cmd ci
npx.cmd playwright install chromium
```

Open the [demonstration index](demonstrations/README.md) and compare the complete source of the example you want to run with its input. Check its SHA-256 against the execution record. Demonstrations use Chromium and the public SauceDemo site. Codex is needed only to generate new candidates.

The following commands restore the cart example to a fresh candidate path and preserve every byte. To restore another example, set `$name` to `invalid-login.spec.ts` or `sort-by-price.spec.ts` and compare it with that example's published hash. The sort filename restores the reviewed revision.

```powershell
$name = 'add-to-cart.spec.ts'
$source = Join-Path (Get-Location).Path "bonus/demonstrations/${name}.txt"
$candidate = Join-Path (Get-Location).Path "bonus/generated/${name}"
[System.IO.File]::Copy($source, $candidate, $false)
$reviewedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash.ToLowerInvariant()
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $candidate).Hash -ne $reviewedHash) {
    throw 'The copy does not match the demonstration.'
}
$reviewedHash
```

After reviewing the source and confirming that the printed hash matches the execution record, run these commands in the same terminal.

```powershell
npm.cmd run bonus:approve -- --file $name --sha256 $reviewedHash
if ($LASTEXITCODE -ne 0) { throw 'Approval failed.' }
npm.cmd run bonus:test -- --file $name
```

To generate a new candidate, install the pinned Codex CLI, sign in with your own ChatGPT account, and choose an unused output filename. Then follow [Review and run](#review-and-run).

```powershell
npm.cmd install -g @openai/codex@0.172.0
codex.cmd login
codex.cmd login status
npm.cmd run bonus:generate -- --input bonus/examples/add-to-cart.md --output backpack-review.spec.ts --provider codex
```

## Prerequisites

- Node.js 24 LTS and the repository dependencies installed with `npm ci`.
- For generation, use the official Codex CLI release `0.172.0` and a trusted `PATH`. Install it with `npm install -g @openai/codex@0.172.0` or use the corresponding official native distribution. On Windows, the generator resolves the native binary used by the official npm `codex.cmd` installation. The version check confirms the version string.
- An existing ChatGPT login checked with `codex login status`. Run `codex login` and use your own account if needed. This workflow uses your account's available limits and requires no separate API key. In Windows PowerShell, use `codex.cmd login` if the PowerShell shim is blocked.
- Chromium installed with `npx playwright install chromium` for a later approved run. Generation and static checking need no browser.

## Supported AI providers

| Provider | Support |
| --- | --- |
| Codex CLI | The supported provider and the default. Live headless generation with the current provider adapter and JSONL parser is verified on Windows using CLI 0.172.0. |
| Claude Code, Cursor | Currently unimplemented. Each requires a separate adapter implementing `TestGenerationProvider`. |

Use your own provider sign-in. Existing demonstration sources can run without a Codex installation or session after local review and approval. The generator accepts only the named `codex` provider.

## Generate

Save a UTF-8 `.md` or `.txt` file of up to 12 KiB under `bonus/examples/`. Include nonempty `Steps` and `Expected result` headings, with optional title and preconditions. Markdown headings and plain text labels both work.

```text
Title: Add a product to the cart

Steps:
1. Sign in as the standard user.
2. Add Sauce Labs Backpack and open the cart.

Expected result:
- The cart shows one visible Backpack priced at $29.99.
```

```sh
npm run bonus:generate -- --input bonus/examples/add-to-cart.md
npm run bonus:generate -- --input bonus/examples/add-to-cart.md --output backpack-review.spec.ts --provider codex
npm run bonus:generate -- --help
```

Use `npm.cmd` in Windows PowerShell if the npm PowerShell shim is blocked. The default output for `add-to-cart.md` is `bonus/generated/add-to-cart.spec.ts`. An explicit output is a lowercase basename such as `backpack-review.spec.ts`. Use a fresh name for each attempt because writes are exclusive. Exit 0 indicates a written candidate or help, exit 2 indicates CLI usage errors, exit 1 indicates generation or validation failures, and exit 130 indicates an interruption.

## Review and run

1. Create a text case and generate a candidate using the commands above.
2. Read the entire file in `bonus/generated/`. Check its imports, fixture capabilities, destination URLs, side effects, assertions, and expected data against the original scenario. If you edit the file, review the edited source in full and calculate its new SHA-256.
3. Calculate the SHA-256 of the reviewed file with PowerShell.

   ```powershell
   Get-FileHash -Algorithm SHA256 bonus/generated/add-to-cart.spec.ts
   ```

4. Run the approval command with the 64 hexadecimal digits from that output. The command checks the hash, repeats source validation, and creates an exclusive local record containing the hash and exact source. The command verifies byte identity. The reviewer is responsible for having read the code.

   ```sh
   npm run bonus:approve -- --file add-to-cart.spec.ts --sha256 <reviewed-hash>
   ```

5. Run exactly the approved file you selected.

   ```sh
   npm run bonus:test -- --file add-to-cart.spec.ts
   ```

6. Review the Playwright result. Record the actual outcome against the exact executed SHA-256 when preparing a demonstration.

The runner requires one filename. It rejects missing or modified approval records and stages the approved bytes in a unique temporary directory. Before discovery, the bonus config compares the staged bytes with the recorded hash, revalidates the staged source and matches that exact file. It uses Chromium against SauceDemo with one worker, zero retries and trace, screenshot and video capture disabled. Results go to `bonus/test-results/`. Generated candidates, the `<name>.spec.ts.approved.json` records, temporary run directories, and results stay local. Approval refuses to overwrite an existing record. Use a fresh filename for a revision, or remove its old local record explicitly and review the revision again.

Use `npm run bonus:typecheck` and `npm run bonus:diagnostics` to check the tooling. Diagnostics use local synthetic sources and mock subprocesses, including one isolated Playwright test that uses an in-memory fixture. A fresh clone requires local approval of each example you choose to run. [Demonstration index](demonstrations/README.md)

## Security model

- The CLI sends the template, the checked-in UI API reference, `AGENTS.md`, and the scenario as a JSON string over stdin. It does not enumerate the repository or read authentication files. Provide public demo scenarios only. Token-pattern checks catch some common credentials and cannot recognize every secret.
- Codex uses a temporary empty working directory inside the ignored output directory, an ephemeral turn, read-only sandboxing, and no approvals. The invocation suppresses user config, project discovery and local project instructions, plugins, apps, hooks, shell tools, local image access, search, and host skill discovery. The subprocess receives a small environment allowlist without API key variables. Codex's own login machinery accesses local ChatGPT authentication.
- JSONL validation checks event shapes, a single ordered turn, one final response, and successful completion. Valid warnings and errors that a turn recovers from are accepted without printing their text. Fatal event output and raw logs stay private. Unexpected tool or execution events abort generation after they appear. Preventing tool actions depends on the invocation restrictions. A syntax- and static-checked response rejected only by TypeScript is kept locally as `<name>.spec.ts.rejected.txt` for comparison, outside discovery.
- The AST validator permits one plain test declaration, specific named imports and fixtures, a limited TypeScript syntax and property set, and local bindings. It rejects obvious literal-only comparisons such as `expect(true).toBe(true)` while permitting assertions against fixed expectations. Matcher presence alone gives no guarantee of meaningful coverage. Human review must verify that assertions match the input scenario. Static validation is not a runtime security sandbox. The typecheck uses a virtual source without executing its JavaScript.
- Output names cannot select directories, absolute paths, Windows alternate streams, or reserved devices. Directory components are checked for symlinks and junctions before writes. Exclusive creation rejects existing files and final-component redirects.

## Limits

Codex read-only sandboxing constrains tool access. It does not establish a whole-machine read boundary. System or organization-managed Codex settings can supply configuration beyond the user's editable settings. Use a trusted official installation, trusted `PATH`, and local directories under your control. On Windows the generation timeout terminates the direct subprocess and closes its streams. The diagnostics observe a self-terminating descendant. Full process-tree termination on Windows is not guaranteed. On POSIX the runner for Codex targets its process group.

The approval hash and isolated copy reduce accidental substitution. A process with write access can still change both fields of an approval record or replace a staged file, trusted dependency, or parent directory. Playwright opens the staged path after validation, including during discovery and in workers. Keep the repository stable while reviewing and running. Cleanup removes the known staged file and empty scratch directory. An interrupted run or unexpected contents can leave an ignored scratch directory for local inspection.

The allowlist is intentionally small and may reject legitimate Playwright features. A future Codex release requires rechecking flags, the event protocol, and tool restrictions. Windows is the verified generation environment. The examples cover three workflows already exercised by the mandatory suite. [Generation report](GENERATION_REPORT.md)
