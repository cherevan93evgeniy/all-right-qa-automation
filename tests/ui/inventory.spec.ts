import { expect, test } from '../../fixtures/ui.fixture';

const catalogSize = 6;

test('UI-02 displays six products with unique names, valid prices, and loaded images', async ({ authenticatedPage }) => {
  const inventory = authenticatedPage;

  await expect(inventory.inventoryList).toBeVisible();
  await expect(inventory.products).toHaveCount(catalogSize);
  const products = await inventory.getProductSummaries();

  expect(products).toHaveLength(catalogSize);
  expect(new Set(products.map(product => product.name.trim())).size).toBe(catalogSize);

  for (const [index, product] of products.entries()) {
    const image = inventory.productImageAt(index);

    await expect(inventory.products.nth(index)).toBeVisible();
    expect(product.name).toMatch(/\S/);
    expect(Number.isFinite(product.price)).toBe(true);
    expect(product.price).toBeGreaterThan(0);
    await expect(image).toBeVisible();
    await expect.poll(
      () => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0),
      { message: `Image for ${product.name} should finish loading` },
    ).toBe(true);
  }
});

test('UI-03 sorts products by price ascending and preserves their original prices', async ({ authenticatedPage }) => {
  const inventory = authenticatedPage;
  await expect(inventory.products).toHaveCount(catalogSize);
  const originalProducts = await inventory.getProductSummaries();
  expect(originalProducts).toHaveLength(catalogSize);
  expect(new Set(originalProducts.map(product => product.name)).size).toBe(catalogSize);
  const expectedPrices = originalProducts.map(product => product.price).sort((left, right) => left - right);

  await inventory.sortProducts('lohi');

  await expect(inventory.sortDropdown).toHaveValue('lohi');
  await expect(inventory.products).toHaveCount(originalProducts.length);
  await expect.poll(async () => {
    const products = await inventory.getProductSummaries();
    return { prices: products.map(product => product.price), products };
  }, { message: 'The catalog should keep each product and order prices low to high' }).toEqual({
    prices: expectedPrices,
    products: expect.arrayContaining(originalProducts),
  });
});

test('UI-04 sorts products by name descending and preserves their original prices', async ({ authenticatedPage }) => {
  const inventory = authenticatedPage;
  await expect(inventory.products).toHaveCount(catalogSize);
  const originalProducts = await inventory.getProductSummaries();
  expect(originalProducts).toHaveLength(catalogSize);
  const expectedProducts = [...originalProducts].sort((left, right) => right.name.localeCompare(left.name, 'en'));

  await inventory.sortProducts('za');

  await expect(inventory.sortDropdown).toHaveValue('za');
  await expect(inventory.products).toHaveCount(originalProducts.length);
  await expect.poll(
    () => inventory.getProductSummaries(),
    { message: 'The catalog should order product names Z to A and keep each original price' },
  ).toEqual(expectedProducts);
});
