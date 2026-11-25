import { test as base } from '@playwright/test';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { InventoryPage } from '../pages/inventory.page';
import { LoginPage } from '../pages/login.page';
import { standardUser } from '../test-data/users';

type UiFixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  authenticatedPage: InventoryPage;
};

export const test = base.extend<UiFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  authenticatedPage: async ({ loginPage, inventoryPage }, use) => {
    await loginPage.open();
    await loginPage.login(standardUser.username, standardUser.password);
    await inventoryPage.page.waitForURL('**/inventory.html');
    await inventoryPage.inventoryList.waitFor({ state: 'visible' });
    await use(inventoryPage);
  },
});

export { expect } from '@playwright/test';
