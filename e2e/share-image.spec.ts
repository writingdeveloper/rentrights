import { test, expect } from '@playwright/test';

test('result offers a shareable image link to the share-card API', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible();

  const link = page.getByRole('link', { name: /save shareable image/i });
  await expect(link).toHaveAttribute('href', /\/api\/share-card\?regime=RSO/);
});

test('share-card API returns a PNG for a valid regime and 400 for junk', async ({ request }) => {
  const ok = await request.get('/api/share-card?regime=RSO&locale=en');
  expect(ok.status()).toBe(200);
  expect(ok.headers()['content-type']).toContain('image/png');

  const bad = await request.get('/api/share-card?regime=HACK');
  expect(bad.status()).toBe(400);
});
