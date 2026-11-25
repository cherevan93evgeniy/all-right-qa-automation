import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { validateStagedApproval } from './approval.mts';
import { bonusRoot, candidatePath } from './paths.mts';

const directory = process.env.BONUS_RUN_DIRECTORY;
const name = process.env.BONUS_RUN_FILE;
if (!directory || !/^\.run-[a-zA-Z0-9]{6,}$/.test(directory) || !name) {
  throw new Error('Use npm run bonus:test -- --file name.spec.ts to select an approved spec.');
}
const testDir = join(bonusRoot, directory);
const file = candidatePath(name, testDir);
validateStagedApproval(name, file);
const testMatch = new RegExp(`^${file.replace(/[.*+?^$${}()|[\]\\]/g, '\\$&')}$`);

export default defineConfig({
  testDir,
  outputDir: join(bonusRoot, 'test-results', directory),
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: 'list',
  projects: [{
    name: 'chromium',
    testMatch,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: 'https://www.saucedemo.com',
      testIdAttribute: 'data-test',
      trace: 'off',
      screenshot: 'off',
      video: 'off',
    },
  }],
});
