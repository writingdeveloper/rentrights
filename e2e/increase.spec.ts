import { test, expect } from '@playwright/test';

test('flags an over-cap increase on a real RSO address', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible();
  // Round-2: plain-language subtitle renders under the verdict title.
  await expect(page.getByText(/In plain terms/i)).toBeVisible();

  // 2000 -> 2200 is a 10% increase: over the RSO 3% cap AND over the pending 1–4% range,
  // so the "over" verdict is date-stable.
  await page.getByLabel('Current monthly rent').fill('2000');
  await page.getByLabel('Proposed new rent').fill('2200');
  await expect(page.getByText(/over the legal cap/i)).toBeVisible();
});
