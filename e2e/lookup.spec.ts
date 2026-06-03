import { test, expect } from '@playwright/test';

test('RSO result for a pre-1978 multi-unit LA address', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  // Date-stable assertions only (cap % is date-dependent — do NOT assert "3%").
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible();
  await expect(page.getByText('High confidence')).toBeVisible();
  await expect(page.getByText(/Built in 1931/)).toBeVisible();
  await expect(page.getByText(/6 units on the parcel/)).toBeVisible();
});

test('friendly error for an unfindable address', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('asdfqwer zxcv nowhere');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/could not find that address/i)).toBeVisible();
});

test('unincorporated LA County guidance + DCBA in get-help', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1000 N Eastern Ave, East Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/unincorporated LA County/i).first()).toBeVisible();
  await expect(page.getByText(/DCBA/).first()).toBeVisible();
});
