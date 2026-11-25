import type { Locator, Page } from '@playwright/test';
import { readCartProduct, type CartProduct } from './cart-product';

export class CartPage {
  readonly cartList: Locator;
  readonly products: Locator;
  readonly checkoutButton: Locator;

  constructor(readonly page: Page) {
    this.cartList = page.getByTestId('cart-contents-container').getByTestId('cart-list');
    this.products = this.cartList.getByTestId('inventory-item');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout', exact: true });
  }

  async getProducts(): Promise<CartProduct[]> {
    await this.cartList.waitFor({ state: 'visible' });
    const products = await this.products.all();
    return Promise.all(products.map(readCartProduct));
  }

  async removeProduct(name: string): Promise<void> {
    await this.productByName(name).getByRole('button', { name: 'Remove', exact: true }).click();
  }

  async startCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }

  productByName(name: string): Locator {
    const productName = this.page.getByTestId('inventory-item-name')
      .and(this.page.getByText(name, { exact: true }));
    return this.products.filter({ has: productName });
  }
}
