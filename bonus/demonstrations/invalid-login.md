# BONUS-02 — Reject an invalid password

| Field | Recorded result |
| --- | --- |
| Original input | [invalid-login.md](../examples/invalid-login.md) |
| Exact generated and executed source | [invalid-login.spec.ts.txt](invalid-login.spec.ts.txt) |
| Generated, approved, executed, and demonstration SHA-256 | `d3674a000ca1c25055d6ce8b3756b009fc11edea979177799b966bada0eaf88b` |
| Generation attempts | One completed response, accepted on the first attempt. |
| Static validation | Syntax and AST policy passed for the response and the copied source. |
| TypeScript | Strict TypeScript passed. |
| Manual corrections | No manual code corrections required. |
| Human approval | The reviewer explicitly confirmed the filename and hash presented in the approval request. |
| Execution | Windows Chromium against live SauceDemo on 2026-11-25. One test passed on the first attempt. Exit code 0, zero retries. |
| Duration | Playwright test 516 ms, Playwright invocation 3.0 s, elapsed `bonus:test` command 6,240 ms. |

All eight awaited assertions passed. The error was visible and matched the expected text. The browser remained on the login URL, the catalog was hidden, the form stayed visible, both fields were editable, and Login remained enabled.
