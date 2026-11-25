import { expect, test } from '../../fixtures/ui.fixture';
import { validCustomer } from '../../test-data/customers';
import { cartProductNames } from '../../test-data/products';

const toCents = (amount: number): number => Math.round(amount * 100);

test('UI-07 completes checkout with the original products and correct totals', async ({
  page, authenticatedPage, cartPage, checkoutPage,
}) => {
  const inventory = authenticatedPage;
  await expect(inventory.cartBadge).toHaveCount(0);
  const catalogProducts = await Promise.all([
    inventory.getProduct(cartProductNames.backpack),
    inventory.getProduct(cartProductNames.bikeLight),
  ]);
  const expectedProducts = catalogProducts.map(({ name, price }) => ({ name, price, quantity: 1 }));
  const subtotalCents = expectedProducts.reduce((sum, { price, quantity }) => sum + toCents(price) * quantity, 0);

  for (const product of expectedProducts) {
    await inventory.addProductToCart(product.name);
  }
  await inventory.openCart();
  await cartPage.startCheckout();

  await expect(page).toHaveURL(/\/checkout-step-one\.html$/);
  await expect(checkoutPage.title).toHaveText('Checkout: Your Information');
  await expect(checkoutPage.informationForm).toBeVisible();

  await checkoutPage.fillCustomerInfo(validCustomer);
  await checkoutPage.continueToOverview();

  await expect(page).toHaveURL(/\/checkout-step-two\.html$/);
  await expect(checkoutPage.title).toHaveText('Checkout: Overview');
  await expect(checkoutPage.overviewList).toBeVisible();
  await expect(checkoutPage.overviewProducts).toHaveCount(expectedProducts.length);
  for (const { name } of expectedProducts) {
    await expect(checkoutPage.overviewProductByName(name)).toBeVisible();
  }
  await expect.poll(async () => {
    const products = await checkoutPage.getProducts();
    return { count: products.length, products };
  }).toEqual({ count: expectedProducts.length, products: expect.arrayContaining(expectedProducts) });

  expect(toCents(await checkoutPage.getItemTotal()), 'Item total should match the original catalog subtotal').toBe(subtotalCents);
  const taxCents = toCents(await checkoutPage.getTax());
  expect(Number.isSafeInteger(taxCents)).toBe(true);
  expect(taxCents).toBeGreaterThanOrEqual(0);
  expect(toCents(await checkoutPage.getTotal()), 'Order total should equal the original catalog subtotal plus displayed tax')
    .toBe(subtotalCents + taxCents);

  await checkoutPage.finishOrder();

  await expect(page).toHaveURL(/\/checkout-complete\.html$/);
  await expect(checkoutPage.title).toHaveText('Checkout: Complete!');
  await expect(checkoutPage.successMessage).toHaveText('Thank you for your order!');

  await checkoutPage.backToProducts();

  await expect(page).toHaveURL(/\/inventory\.html$/);
  await expect(inventory.inventoryList).toBeVisible();
  await expect(inventory.cartBadge).toHaveCount(0);
  await inventory.openCart();
  await expect(page).toHaveURL(/\/cart\.html$/);
  await expect(cartPage.cartList).toBeVisible();
  await expect(cartPage.products).toHaveCount(0);
});

test('UI-10 requires a postal code before proceeding to order overview', async ({
  page, authenticatedPage, cartPage, checkoutPage,
}) => {
  const inventory = authenticatedPage;
  await expect(inventory.cartBadge).toHaveCount(0);
  await inventory.addProductToCart(cartProductNames.backpack);
  await inventory.openCart();
  await expect(cartPage.products).toHaveCount(1);
  await expect(cartPage.productByName(cartProductNames.backpack)).toBeVisible();
  await cartPage.startCheckout();
  await expect(checkoutPage.informationForm).toBeVisible();
  await checkoutPage.fillCustomerInfo({ ...validCustomer, postalCode: '' });

  await checkoutPage.continueToOverview();

  await expect(checkoutPage.errorMessage).toBeVisible();
  await expect(checkoutPage.errorMessage, 'Checkout should explain that the postal code is required')
    .toHaveText('Error: Postal Code is required');
  await expect(page).toHaveURL(/\/checkout-step-one\.html$/);
  await expect(checkoutPage.title).toHaveText('Checkout: Your Information');
  await expect(checkoutPage.informationForm).toBeVisible();
  await expect(checkoutPage.overviewList).toBeHidden();
  await expect(checkoutPage.finishButton).toBeHidden();
  await expect(checkoutPage.successMessage).toBeHidden();
});
