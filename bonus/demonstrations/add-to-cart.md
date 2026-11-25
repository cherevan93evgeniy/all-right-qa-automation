# BONUS-01 — Add a product to the cart

| Field | Recorded result |
| --- | --- |
| Original input | [add-to-cart.md](../examples/add-to-cart.md) |
| Exact generated and executed source | [add-to-cart.spec.ts.txt](add-to-cart.spec.ts.txt) |
| Generated, approved, executed, and demonstration SHA-256 | `be5345012d0e600a089cdc740dab02759b2e505fdc17518ae2b2ccd4c7bf5abe` |
| Generation attempts | Three completed responses. The first failed the member allowlist and the second used unsupported TypeScript syntax. The third passed after prompt refinement. |
| Static validation | Syntax and AST policy passed for the third response and the copied source. |
| TypeScript | Strict TypeScript passed. |
| Manual corrections | No manual code corrections required. |
| Human approval | The reviewer explicitly confirmed the filename and hash presented in the approval request. |
| Execution | Windows Chromium against live SauceDemo on 2026-11-25. One test passed on the first attempt. Exit code 0, zero retries. |
| Duration | Playwright test 656 ms, Playwright invocation 3.2 s, elapsed `bonus:test` command 6,523 ms. |

All three awaited assertions passed. The cart URL ended in `/cart.html`, the Backpack row was visible, and the cart contained exactly that row with price 29.99 and quantity 1.
