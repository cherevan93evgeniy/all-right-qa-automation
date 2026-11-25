import type { Locator } from '@playwright/test';
import { parseSauceDemoPrice } from './saucedemo-price';

export type CartProduct = {
  name: string;
  price: number;
  quantity: number;
};

export async function readCartProduct(product: Locator): Promise<CartProduct> {
  const [name, price, quantity] = await Promise.all([
    product.getByTestId('inventory-item-name').innerText(),
    product.getByTestId('inventory-item-price').innerText(),
    product.getByTestId('item-quantity').innerText(),
  ]);
  return { name, price: parseSauceDemoPrice(price), quantity: Number(quantity) };
}
