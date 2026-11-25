import type { Locator, Page } from '@playwright/test';
import { readCartProduct, type CartProduct } from './cart-product';
import { parseSauceDemoPrice } from './saucedemo-price';

export type CustomerInfo = {
  firstName: string;
  lastName: string;
  postalCode: string;
};

export class CheckoutPage {
  readonly title: Locator;
  readonly informationForm: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly errorMessage: Locator;
  readonly overviewList: Locator;
  readonly overviewProducts: Locator;
  readonly itemTotal: Locator;
  readonly tax: Locator;
  readonly total: Locator;
  readonly finishButton: Locator;
  readonly successMessage: Locator;
  readonly backHomeButton: Locator;

  constructor(page: Page) {
    this.title = page.getByTestId('title');

    this.informationForm = page.getByRole('form', { name: 'Checkout information', exact: true });
    this.firstNameInput = this.informationForm.getByRole('textbox', { name: 'First Name', exact: true });
    this.lastNameInput = this.informationForm.getByRole('textbox', { name: 'Last Name', exact: true });
    this.postalCodeInput = this.informationForm.getByRole('textbox', { name: 'Zip/Postal Code', exact: true });
    this.continueButton = this.informationForm.getByRole('button', { name: 'Continue', exact: true });
    this.errorMessage = this.informationForm.getByRole('alert');

    const overview = page.getByTestId('checkout-summary-container');
    this.overviewList = overview.getByTestId('cart-list');
    this.overviewProducts = this.overviewList.getByTestId('inventory-item');
    this.itemTotal = overview.getByTestId('subtotal-label');
    this.tax = overview.getByTestId('tax-label');
    this.total = overview.getByTestId('total-label');
    this.finishButton = overview.getByRole('button', { name: 'Finish', exact: true });

    const completion = page.getByTestId('checkout-complete-container');
    this.successMessage = completion.getByTestId('complete-header');
    this.backHomeButton = completion.getByRole('button', { name: 'Back Home', exact: true });
  }

  async fillCustomerInfo({ firstName, lastName, postalCode }: CustomerInfo): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continueToOverview(): Promise<void> {
    await this.continueButton.click();
  }

  async getProducts(): Promise<CartProduct[]> {
    await this.overviewList.waitFor({ state: 'visible' });
    const products = await this.overviewProducts.all();
    return Promise.all(products.map(readCartProduct));
  }

  overviewProductByName(name: string): Locator {
    const page = this.overviewProducts.page();
    const productName = page.getByTestId('inventory-item-name')
      .and(page.getByText(name, { exact: true }));
    return this.overviewProducts.filter({ has: productName });
  }

  async getItemTotal(): Promise<number> {
    return parseSauceDemoPrice(await this.itemTotal.innerText());
  }

  async getTax(): Promise<number> {
    return parseSauceDemoPrice(await this.tax.innerText());
  }

  async getTotal(): Promise<number> {
    return parseSauceDemoPrice(await this.total.innerText());
  }

  async finishOrder(): Promise<void> {
    await this.finishButton.click();
    await this.successMessage.waitFor({ state: 'visible' });
  }

  async backToProducts(): Promise<void> {
    await this.backHomeButton.click();
  }
}
