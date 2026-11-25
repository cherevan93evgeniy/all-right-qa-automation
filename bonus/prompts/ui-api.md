# Accessible UI API and verified behavior

The test executes in Chromium against `https://www.saucedemo.com`. The `data-test` attribute is configured for test IDs. All actions must use these existing fixtures and methods.

| Fixture | Methods and locators |
| --- | --- |
| loginPage | `open()`, `login(username, password)`; locators `form`, `usernameInput`, `passwordInput`, `loginButton`, `errorMessage` |
| inventoryPage / authenticatedPage | `getProductSummaries()` returns an array of `{ name, price }`; `getProduct(name)` returns one such record; `sortProducts('az'\|'za'\|'lohi'\|'hilo')`, `addProductToCart(name)`, `openCart()`, `addToCartButton(name)`, `removeButton(name)`, `productImageAt(index)`; locators `inventoryList`, `products`, `cartButton`, `cartBadge`, `sortDropdown`. The authenticated variant opens Inventory and waits for the list. |
| cartPage | `getProducts()` returns an array of `{ name, price, quantity }`; `productByName(name)`, `removeProduct(name)`, `startCheckout()`; locators `cartList`, `products`, `checkoutButton` |
| checkoutPage | `fillCustomerInfo({ firstName, lastName, postalCode })`, `continueToOverview()`, `getProducts()`, `overviewProductByName(name)`, `getItemTotal()`, `getTax()`, `getTotal()`, `finishOrder()`, `backToProducts()`; locators `title`, `informationForm`, `firstNameInput`, `lastNameInput`, `postalCodeInput`, `continueButton`, `errorMessage`, `overviewList`, `overviewProducts`, `itemTotal`, `tax`, `total`, `finishButton`, `successMessage`, `backHomeButton` |
| page | `url()` and `expect(page).toHaveURL(...)` |

The UI test data imports from `../../test-data/products` expose `cartProductNames.backpack` and `cartProductNames.bikeLight`. Imports from `../../test-data/users` expose `standardUser.username`, `standardUser.password`, and `invalidPassword`. Import `validCustomer` from `../../test-data/customers` for the shared checkout data.

Inventory opens at `/inventory.html`. Cart opens at `/cart.html`. Login rejection stays at `/`, leaves Login controls usable, and keeps the catalog hidden. Inventory and Cart row readers wait for their containers, so use count assertions or `expect.poll` to establish row readiness.
