import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { defineConfig, devices } from '@playwright/test';

const envPath = resolve(__dirname, '.env');
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const uiBaseURL = process.env.UI_BASE_URL || 'https://www.saucedemo.com';

const apiBaseURL = process.env.API_BASE_URL || 'https://restful-booker.herokuapp.com';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure', testIdAttribute: 'data-test' },
  projects: [
    {
      name: 'chromium',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: uiBaseURL },
    },
    {
      name: 'firefox',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Desktop Firefox'], baseURL: uiBaseURL },
    },
    {
      name: 'webkit',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Desktop Safari'], baseURL: uiBaseURL },
    },
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
      use: { baseURL: apiBaseURL },
    },
  ],
});
