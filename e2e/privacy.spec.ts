import { test, expect } from '@playwright/test';

test('privacy (EN): discloses analytics + gives an opt-out link', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  await expect(page.getByText(/Google Analytics/).first()).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'https://tools.google.com/dlpage/gaoptout' }),
  ).toHaveAttribute('href', 'https://tools.google.com/dlpage/gaoptout');
});

test('privacy (ES): forced Spanish at /es/privacy', async ({ page }) => {
  await page.goto('/es/privacy');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { name: 'Privacidad', level: 1 })).toBeVisible();
});

test('home footer links to the privacy policy', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: 'Privacy' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/privacy');
});
