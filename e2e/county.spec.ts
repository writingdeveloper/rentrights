import { test, expect } from '@playwright/test';

test('classifies a real unincorporated County address under County RSTPO', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1000 N Eastern Ave, East Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  // East LA is unincorporated → County classification + DCBA in get-help. Date-stable text only.
  await expect(page.getByText(/unincorporated LA County/i).first()).toBeVisible();
  await expect(page.getByText(/DCBA/).first()).toBeVisible();
});
