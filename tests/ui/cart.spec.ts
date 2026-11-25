import { expect, test } from '../../fixtures/ui.fixture';
import { cartProductNames } from '../../test-data/products';

test('UI-05 adds the selected product to the cart at its original price', async ({ page, authenticatedPage, cartPage }) => {
  const inventory = authenticatedPage;
  await expect(inventory.cartBadge).toHaveCount(0);
  const { name, price } = await inventory.getProduct(cartProductNames.backpack);
  await expect(inventory.addToCartButton(name)).toBeVisible();

  await inventory.addProductToCart(name);

  await expect(inventory.cartBadge).toBeVisible();
  await expect(inventory.cartBadge).toHaveText('1');
  await expect(inventory.addToCartButton(name)).toBeHidden();
  await expect(inventory.removeButton(name)).toBeVisible();

  await inventory.openCart();

  await expect(page).toHaveURL(/\/cart\.html$/);
  await expect(cartPage.products).toHaveCount(1);
  await expect(cartPage.productByName(name)).toBeVisible();
  await expect.poll(
    () => cartPage.getProducts(),
    { message: 'The cart should contain the selected product at its original price and quantity one' },
  ).toEqual([{ name, price, quantity: 1 }]);
});

test('UI-06 removes the selected product and keeps the other cart item unchanged', async ({ page, authenticatedPage, cartPage }) => {
  const inventory = authenticatedPage;
  await expect(inventory.cartBadge).toHaveCount(0);
  const [backpack, bikeLight] = await Promise.all([
    inventory.getProduct(cartProductNames.backpack),
    inventory.getProduct(cartProductNames.bikeLight),
  ]);
  const expectedBackpack = { name: backpack.name, price: backpack.price, quantity: 1 };
  const expectedBikeLight = { name: bikeLight.name, price: bikeLight.price, quantity: 1 };

  await inventory.addProductToCart(backpack.name);
  await inventory.addProductToCart(bikeLight.name);
  await expect(inventory.cartBadge).toBeVisible();
  await expect(inventory.cartBadge).toHaveText('2');
  await inventory.openCart();
  await expect(page).toHaveURL(/\/cart\.html$/);
  await expect(cartPage.productByName(backpack.name)).toBeVisible();
  await expect(cartPage.productByName(bikeLight.name)).toBeVisible();
  await expect.poll(async () => {
    const products = await cartPage.getProducts();
    return { count: products.length, products };
  }).toEqual({
    count: 2,
    products: expect.arrayContaining([expectedBackpack, expectedBikeLight]),
  });

  await cartPage.removeProduct(bikeLight.name);

  await expect(cartPage.productByName(bikeLight.name), 'The selected Bike Light row should be removed').toHaveCount(0);
  await expect(cartPage.products).toHaveCount(1);
  await expect(cartPage.productByName(backpack.name)).toBeVisible();
  await expect.poll(() => cartPage.getProducts()).toEqual([expectedBackpack]);
  await expect(inventory.cartBadge).toBeVisible();
  await expect(inventory.cartBadge).toHaveText('1');
});
