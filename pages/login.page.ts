import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly form: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(readonly page: Page) {
    this.form = page.getByRole('form', { name: 'Login', exact: true });
    this.usernameInput = this.form.getByRole('textbox', { name: 'Username', exact: true });
    this.passwordInput = this.form.getByRole('textbox', { name: 'Password', exact: true });
    this.loginButton = this.form.getByRole('button', { name: 'Login', exact: true });
    this.errorMessage = page.getByRole('alert');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
