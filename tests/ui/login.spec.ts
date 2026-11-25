import { expect, test } from '../../fixtures/ui.fixture';
import { invalidPassword, standardUser } from '../../test-data/users';

test('UI-01 opens the six-product catalog with valid credentials', async ({ page, loginPage, inventoryPage }) => {
  await loginPage.open();

  await loginPage.login(standardUser.username, standardUser.password);

  await expect(page).toHaveURL(/\/inventory\.html$/);
  await expect(inventoryPage.inventoryList).toBeVisible();
  await expect(inventoryPage.products).toHaveCount(6);
});

test('UI-08 rejects an invalid password and keeps the login page open', async ({ page, loginPage, inventoryPage }) => {
  await loginPage.open();
  const loginUrl = page.url();

  await loginPage.login(standardUser.username, invalidPassword);

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toHaveText(
    'Epic sadface: Username and password do not match any user in this service',
  );
  await expect(page).toHaveURL(loginUrl);
  await expect(loginPage.form).toBeVisible();
  await expect(loginPage.usernameInput).toBeVisible();
  await expect(loginPage.usernameInput).toBeEditable();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeEditable();
  await expect(loginPage.loginButton).toBeVisible();
  await expect(loginPage.loginButton).toBeEnabled();
  await expect(inventoryPage.inventoryList).toBeHidden();
});

test('UI-09 requires a username and keeps the login page open', async ({ page, loginPage, inventoryPage }) => {
  await loginPage.open();
  const loginUrl = page.url();

  await loginPage.login('', standardUser.password);

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toHaveText('Epic sadface: Username is required');
  await expect(page).toHaveURL(loginUrl);
  await expect(loginPage.form).toBeVisible();
  await expect(loginPage.usernameInput).toBeVisible();
  await expect(loginPage.usernameInput).toBeEditable();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeEditable();
  await expect(loginPage.loginButton).toBeVisible();
  await expect(loginPage.loginButton).toBeEnabled();
  await expect(inventoryPage.inventoryList).toBeHidden();
});
