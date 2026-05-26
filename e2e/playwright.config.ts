import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3200',
    headless: true,
  },
  webServer: [
    {
      command: 'cd ../packages/core && yarn dev',
      url: 'http://localhost:3300/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'cd ../widgets && yarn dev',
      url: 'http://localhost:3200/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
