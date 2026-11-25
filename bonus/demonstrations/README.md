# SauceDemo demonstrations

Each demonstration has a public text case, exact source bytes, and a record of the separate approved Chromium run. Use the [quick start](../README.md#quick-start) to review an example, restore it as a local candidate, and approve and run it without Codex.

| Scenario | Original input | Source used in the approved run | Verification record |
| --- | --- | --- | --- |
| BONUS-01 · Add a product to the cart | [Input](../examples/add-to-cart.md) | [add-to-cart.spec.ts.txt](add-to-cart.spec.ts.txt) | [Results](add-to-cart.md) |
| BONUS-02 · Reject an invalid password | [Input](../examples/invalid-login.md) | [invalid-login.spec.ts.txt](invalid-login.spec.ts.txt) | [Results](invalid-login.md) |
| BONUS-03 · Sort the catalog by price | [Input](../examples/sort-by-price.md) | [sort-by-price.spec.ts.txt](sort-by-price.spec.ts.txt) | [Results](sort-by-price.md) |

The [original sorting source](sort-by-price.original.spec.ts.txt) is included for comparison. The execution record identifies the approved revision and its exact diff.

Git attributes preserve the source bytes. The `.spec.ts.txt` extension keeps these files outside Playwright discovery. The run command stages the exact bytes from one local approval record. Approval records and run artifacts stay in ignored directories. [Generation report](../GENERATION_REPORT.md)
