import { test, expect } from '@playwright/test';

test('cornerstone guide renders the dated caps, CTA, and schema', async ({ page }) => {
  await page.goto('/guides/la-rent-increase-2026');

  await expect(
    page.getByRole('heading', { level: 1, name: /how much can my landlord raise my rent/i }),
  ).toBeVisible();

  // The dated cap table shows the current RSO 3% figure.
  await expect(page.getByText(/3%/).first()).toBeVisible();

  // A prominent CTA links back into the address checker.
  const cta = page.getByRole('link', { name: /check your address/i }).first();
  await expect(cta).toHaveAttribute('href', '/');

  // Article + FAQPage JSON-LD are emitted (alongside the global Org/WebSite schema).
  const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
  expect(ld).toContain('"Article"');
  expect(ld).toContain('"FAQPage"');
});
