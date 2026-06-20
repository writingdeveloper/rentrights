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
    // Use `next dev` for e2e: next.config sets output:'standalone', which makes
    // `next start` unstable (it warns and crashes under sustained load) and makes
    // the standalone server.js need static assets copied beside it plus a
    // bash-only `PORT=` prefix. `next dev -p ${PORT}` is cross-platform, stable,
    // serves the real CSS/fonts (so the axe gate tests styled pages), and runs
    // the API routes — exactly what these behavioural + a11y specs need.
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
