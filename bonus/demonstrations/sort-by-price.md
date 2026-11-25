# BONUS-03 — Sort the catalog by price

| Field | Recorded result |
| --- | --- |
| Original input | [sort-by-price.md](../examples/sort-by-price.md) |
| Exact generated source | [sort-by-price.original.spec.ts.txt](sort-by-price.original.spec.ts.txt) |
| Original SHA-256 | `9ce6c767f21b5541b72d6c87e594b7d864c428c714f48ea6eb3f069968b64371` |
| Exact executed source | [sort-by-price.spec.ts.txt](sort-by-price.spec.ts.txt) |
| Revised, approved, executed, and demonstration SHA-256 | `6957223a2560e0b4b35a9ee58135f66bb20a769d5bb2884f442be14467a0471f` |
| Generation attempts | Three completed responses. The first failed the member allowlist and the second used unsupported TypeScript syntax. The third passed after prompt refinement. |
| Static validation | Syntax and AST policy passed for both the generated source and the reviewed revision. |
| TypeScript | Strict TypeScript passed for both sources. |
| Manual corrections | During review, the reviewer requested string literals for all six expected product names. Two constant references were replaced with their string values and the unused import was removed. |
| Human approval | The reviewer explicitly approved the revised filename and hash after seeing the diff. |
| Execution | Windows Chromium against live SauceDemo on 2026-11-25. The revised version passed on its first attempt with exit code 0 and zero retries. The original generation stayed unexecuted. |
| Duration | Playwright test 534 ms, Playwright invocation 3.0 s, elapsed `bonus:test` command 6,019 ms. |

Both awaited assertions passed. The first checked the count of six rendered rows. The second checked that a polled snapshot contained all six expected name-price pairs and the exact ascending price list. The price list allows either order for the two 15.99 items. If the catalog were already in ascending price order, the final snapshot alone could also pass after a no-op.

```diff
@@ -2 +1,0 @@
-import { cartProductNames } from '../../test-data/products';
@@ -6,2 +5,2 @@
-    { name: cartProductNames.backpack, price: 29.99 },
-    { name: cartProductNames.bikeLight, price: 9.99 },
+    { name: 'Sauce Labs Backpack', price: 29.99 },
+    { name: 'Sauce Labs Bike Light', price: 9.99 },
```
