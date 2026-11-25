# SauceDemo UI Exploration

Codex used Playwright MCP to explore the public SauceDemo site on November 25, 2026. All routes below are relative to `https://www.saucedemo.com`. Accessibility roles and labels came from snapshots. Test IDs and values came from the rendered DOM. The observations record what the browser showed during that investigation. The [Page Object review](#page-object-review-and-limitations) describes the current test implementation.

## Login

Route: `/`

The snapshot showed the `Login` form with `Username` and `Password` textboxes and a `Login` button. The inputs and submit button have `data-test` values `username`, `password`, and `login-button`. The validation heading uses `data-test="error"` and `role="alert"`. The original exact Playwright role locators matched the form controls, including the password textbox, and worked for actual submissions.

| Browser action | Result |
| --- | --- |
| Submit `standard_user` with an incorrect password | Stays at `/` and shows `Epic sadface: Username and password do not match any user in this service` |
| Clear the username and submit with the valid password | Stays at `/` and shows `Epic sadface: Username is required` |
| Submit the published demo credentials | Opens `/inventory.html` |

## Product Catalog

Route: `/inventory.html`

`title` reads `Products`. `inventory-list` contains six `inventory-item` cards with `inventory-item-name`, `inventory-item-desc`, and `inventory-item-price`. The exact name filter works within a card. Each card has an `Add to cart` button, which becomes `Remove` after adding the product. The sort control is the `Sort products` combobox with `data-test="product-sort-container"`. The cart target is an `<a>` with `role="button"` and `data-test="shopping-cart-link"`. Its accessible name changes with cart state. The nested `shopping-cart-badge` is absent when empty.

| Product | Price | `data-test` for Add to cart |
| --- | ---: | --- |
| Sauce Labs Backpack | $29.99 | `add-to-cart-sauce-labs-backpack` |
| Sauce Labs Bike Light | $9.99 | `add-to-cart-sauce-labs-bike-light` |
| Sauce Labs Bolt T-Shirt | $15.99 | `add-to-cart-sauce-labs-bolt-t-shirt` |
| Sauce Labs Fleece Jacket | $49.99 | `add-to-cart-sauce-labs-fleece-jacket` |
| Sauce Labs Onesie | $7.99 | `add-to-cart-sauce-labs-onesie` |
| Test.allTheThings() T-Shirt (Red) | $15.99 | `add-to-cart-test.allthethings()-t-shirt-(red)` |

Each selection reordered the rendered cards on the same URL. The sequences below use shortened product names from the table.

| Option value and displayed label | Observed order |
| --- | --- |
| `az` — Name (A to Z), the initial selection | Backpack, Bike Light, Bolt T-Shirt, Fleece Jacket, Onesie, Red T-Shirt |
| `za` — Name (Z to A) | Red T-Shirt, Onesie, Fleece Jacket, Bolt T-Shirt, Bike Light, Backpack |
| `lohi` — Price (low to high) | Onesie, Bike Light, Bolt T-Shirt, Red T-Shirt, Backpack, Fleece Jacket |
| `hilo` — Price (high to low) | Fleece Jacket, Backpack, Bolt T-Shirt, Red T-Shirt, Bike Light, Onesie |

Each card contained one visible `img` element whose alt text matched the product name. Immediately after navigation, `naturalWidth` was already positive while `complete` was still false. A follow-up browser check successfully decoded all six images, with `complete` true and `naturalWidth` greater than zero. Bike Light was 320 pixels wide and the other five images were 640 pixels wide in that check.

Sorting the original names with descending English collation produced the same sequence as `za` for the observed catalog. The two $15.99 products appeared next to each other in both price sorts. The automated ascending-price test accepts either relative order for equal prices.

Adding Backpack and Bike Light changed the badge to `1` and then `2`. Their buttons changed to `Remove` with `data-test="remove-sauce-labs-backpack"` and `data-test="remove-sauce-labs-bike-light"`. A separate locator check clicked `Remove` in the catalog. Clicking the cart target opened `/cart.html`.

## Shopping Cart

Route: `/cart.html`

`title` reads `Your Cart`. Inside `cart-contents-container`, `cart-list` has `QTY` and `Description` headers and `inventory-item` rows. Each row exposes `inventory-item-name`, `inventory-item-price`, and `item-quantity`. The snapshot showed these two rows after the additions.

| Product | Unit price | Quantity |
| --- | ---: | ---: |
| Sauce Labs Backpack | $29.99 | 1 |
| Sauce Labs Bike Light | $9.99 | 1 |

`Continue Shopping` (`continue-shopping`) returned to `/inventory.html` and reopening the cart preserved both products. Removing Bike Light via the row's `Remove` button kept the URL at `/cart.html`, left Backpack with quantity `1`, and reduced the badge to `1`. `Checkout` (`checkout`) opened `/checkout-step-one.html`.

The cart follow-up confirmed that the empty header control is announced as `Cart, empty` and has no `shopping-cart-badge` element. Removing the final Backpack left the list and its `QTY` and `Description` headings in place, with zero product rows. The route stayed the same and the header returned to `Cart, empty`.

## Checkout Information

Route: `/checkout-step-one.html`

`title` reads `Checkout: Your Information`. The `Checkout information` form in `checkout-info-container` contains the exact textbox names `First Name`, `Last Name`, and `Zip/Postal Code`. Their test IDs are `firstName`, `lastName`, and `postalCode`. The snapshot shows `Cancel` (`cancel`) and `Continue` (`continue`).

Submitting `Demo` / `Customer` with an empty postal code kept the current URL and showed the alert `Error: Postal Code is required` (`error`). Filling all three fields with `Demo`, `Customer`, and `01234`, then submitting, opened `/checkout-step-two.html`.

A fresh two-product checkout confirmed that SauceDemo validates these inputs in sequence. Submitting with all fields empty produced `Error: First Name is required`. After entering the first name, submitting produced `Error: Last Name is required`. After entering both names, the postal-code alert appeared. All three alerts used `data-test="error"` and kept the first-step URL. The form did not use native `required` attributes for these fields. Overview, Finish, and the completion container were absent while the postal code was empty.

## Checkout Overview

Route: `/checkout-step-two.html`

`title` reads `Checkout: Overview`. The `cart-list` inside `checkout-summary-container` showed Backpack, quantity `1`, and unit price `$29.99` via `inventory-item`, `inventory-item-name`, `item-quantity`, and `inventory-item-price`. `payment-info-value` read `SauceCard #31337` and `shipping-info-value` read `Free Pony Express Delivery!`.

| `data-test` | Exact text |
| --- | --- |
| `subtotal-label` | `Item total: $29.99` |
| `tax-label` | `Tax: $2.40` |
| `total-label` | `Total: $32.39` |

The displayed amounts reconcile in cents (2,999 + 240 = 3,239). A local parser probe verified all five distinct catalog prices and all three Overview labels.

The two-product order retained Backpack at `$29.99` and Bike Light at `$9.99`, with quantity `1` in each row. Its labels read `Item total: $39.98`, `Tax: $3.20`, and `Total: $43.18`. These values reconcile in cents (2,999 + 999 + 320 = 4,318). The observed tax in both orders is consistent with 8% rounded to the nearest cent. UI-07 captures unit prices from the catalog before adding the items, converts the amounts to integer cents, and computes the expected subtotal independently. It verifies that displayed tax is a valid non-negative amount and that the total equals the expected subtotal plus that tax. The test uses no fixed tax rate. [Checkout Tests](../tests/ui/checkout.spec.ts)

**Historical investigation.** An immediate `allTextContents()` read after Continue returned empty arrays in one pass. Waiting for the Overview list to become visible before reading returned the expected name and price. The earlier Page Objects read names and prices separately.

In five follow-up passes, the guarded reads returned one name and price in the populated Overview and six of each after returning to the catalog. A separate checkout with an empty cart reached Overview, where the visible list contained zero product rows. The follow-up did not observe rows appearing separately after list visibility.

## Order Confirmation

Route: `/checkout-complete.html`

The `Finish` button (`finish`) opened the completion page. `title` read `Checkout: Complete!`. The snapshot showed the level-two heading `Thank you for your order!`; its test ID is `complete-header` inside `checkout-complete-container`. `complete-text` read `Your order has been dispatched, and will arrive just as fast as the pony can get there!`. `Back Home` (`back-to-products`) returned to `/inventory.html` with all six products and an empty cart. `Generate PDF order` was observed in the snapshot. Cancel and PDF actions were outside the exercised flow.

In the initial implementation, `finishOrder()` returned after the click. During the investigation, an immediate `count()` on `complete-header` returned zero after Finish in all five follow-up passes. Waiting for the heading to become visible returned one match in each pass. The current `finishOrder()` waits for that heading before returning. [Confirmed AI Mistakes and Corrections](../AI_WORKLOG.md#confirmed-ai-mistakes-and-corrections)

After completing the two-product order, the badge was absent on the completion page and again after Back Home returned to `/inventory.html`. Reopening `/cart.html` showed a visible cart list with zero product rows.

## Page Object Review and Limitations

**Current implementation**

The [Playwright configuration](../playwright.config.ts) maps `getByTestId()` to the site's `data-test` attributes.

- [LoginPage](../pages/login.page.ts) resolves `/` against the configured `UI_BASE_URL` and scopes the inputs and button to the named Login form. The negative tests also verify that the form remains usable after rejection.
- [InventoryPage](../pages/inventory.page.ts) reads paired names and prices with `getProductSummaries()` or `getProduct(name)`. It locates the cart control by `shopping-cart-link`, which remains stable as the accessible name changes.
- [CartPage](../pages/cart.page.ts) reads rows with `getProducts()`, finds exact-name rows with `productByName()`, and supports product removal and checkout. `toHaveCount()` in a spec checks the number of matching rows. The shared row reader parses quantity separately for each item.
- [CheckoutPage](../pages/checkout.page.ts) uses `getProducts()` for Overview rows and `overviewProductByName()` for visibility checks. Cart and Overview share [the product row reader](../pages/cart-product.ts). The confirmation locator uses `complete-header`.
- The earlier `getProductNames()`, `getProductPrices()`, `getItemCount()`, and `continueShopping()` helpers were removed. The Continue Shopping button and its behavior remain part of the browser observations.

**Collection readiness.** These readers wait for the list container to be visible, then use `locator.all()` to capture its current row locators. A visible container may have zero rows. `locator.all()` does not wait for matching rows or a stable collection. The specs establish expected state with count or visibility assertions and poll parsed data where it can change. A row count includes hidden matches, so relevant cart and Overview tests also assert visibility by exact product name. [Playwright Locator API](https://playwright.dev/docs/api/class-locator#locator-all)

**Action and assertion waits.** Playwright actions such as `click()` wait for their actionability checks. A click can complete before the application finishes rendering the resulting view. Web-first assertions such as `toBeVisible()` and `toHaveCount()` retry until their conditions pass or their assertion timeout expires. Visibility and whether an element receives pointer events are separate checks. Assertion retries are independent of test-runner retries. [Playwright auto-waiting](https://playwright.dev/docs/actionability) · [Playwright assertions](https://playwright.dev/docs/test-assertions)

**Historical scope.** Initial Playwright Test runs skipped the four UI placeholders in each configured browser. The later checkout investigation used a fresh MCP browser context. The [verification results](../AI_WORKLOG.md#verification-results) distinguish those exploratory checks from runs of the implemented suite.

## Browser Console Observations

The initial MCP session recorded four `401 Unauthorized` responses from `events.backtrace.io` on its `unique-events/submit` and `summed-events/submit` endpoints. The follow-up recorded six such responses and four `unload` permissions-policy errors. Sign-in, catalog reads, and checkout succeeded in the exploration. The cause and functional impact of the console errors remain unverified.
