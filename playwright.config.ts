import { defineConfig, devices } from '@playwright/test';

// Allow overriding the port so local e2e runs can avoid colliding with other
// dev servers.  CI defaults to 3000; locally run with PORT=3100.
const PORT = process.env.PORT || '3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'on-first-retry',
  },
  webServer: {
    // next.config.ts sets output:'standalone', so the correct server is
    // node .next/standalone/server.js (not `next start`).
    command: `npm run build && PORT=${PORT} node .next/standalone/server.js`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
