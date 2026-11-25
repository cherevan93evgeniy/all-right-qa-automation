import type { Locator, Page } from '@playwright/test';
import { parseSauceDemoPrice } from './saucedemo-price';

type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

type InventoryProductSummary = {
  name: string;
  price: number;
};

export class InventoryPage {
  readonly inventoryList: Locator;
  readonly products: Locator;
  readonly cartButton: Locator;
  readonly cartBadge: Locator;
  readonly sortDropdown: Locator;

  constructor(readonly page: Page) {
    this.inventoryList = page.getByTestId('inventory-list');
    this.products = this.inventoryList.getByTestId('inventory-item');
    this.cartButton = page.getByTestId('shopping-cart-link');
    this.cartBadge = this.cartButton.getByTestId('shopping-cart-badge');
    this.sortDropdown = page.getByRole('combobox', { name: 'Sort products', exact: true });
  }

  async getProductSummaries(): Promise<InventoryProductSummary[]> {
    await this.inventoryList.waitFor({ state: 'visible' });
    const products = await this.products.all();
    return Promise.all(products.map(product => this.readProductSummary(product)));
  }

  getProduct(name: string): Promise<InventoryProductSummary> {
    return this.readProductSummary(this.productByName(name));
  }

  productImageAt(index: number): Locator {
    return this.products.nth(index).getByRole('img');
  }

  async sortProducts(option: SortOption): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  async addProductToCart(name: string): Promise<void> {
    await this.addToCartButton(name).click();
  }

  addToCartButton(name: string): Locator {
    return this.productByName(name).getByRole('button', { name: 'Add to cart', exact: true });
  }

  removeButton(name: string): Locator {
    return this.productByName(name).getByRole('button', { name: 'Remove', exact: true });
  }

  async openCart(): Promise<void> {
    await this.cartButton.click();
  }

  private productByName(name: string): Locator {
    const productName = this.page.getByTestId('inventory-item-name')
      .and(this.page.getByText(name, { exact: true }));
    return this.products.filter({ has: productName });
  }

  private async readProductSummary(product: Locator): Promise<InventoryProductSummary> {
    const [name, price] = await Promise.all([
      product.getByTestId('inventory-item-name').innerText(),
      product.getByTestId('inventory-item-price').innerText(),
    ]);
    return { name, price: parseSauceDemoPrice(price) };
  }
}
