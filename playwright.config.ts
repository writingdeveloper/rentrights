import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    timeout: 180_000,
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
