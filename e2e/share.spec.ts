import { test, expect } from '@playwright/test';

test('share link round-trip restores address and result in a new page', async ({ page, context }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible();

  await page.getByRole('button', { name: 'Copy link' }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#a=');

  const page2 = await context.newPage();
  await page2.goto(url);
  await expect(page2.getByPlaceholder('1234 S Main St, Los Angeles')).toHaveValue('1411 Murray Dr, Los Angeles, CA');
  await expect(page2.getByText(/Rent Stabilization Ordinance/)).toBeVisible();
});

test('a Spanish share link renders the result in Spanish', async ({ page }) => {
  await page.goto('/#a=1411+Murray+Dr%2C+Los+Angeles%2C+CA&lang=es');
  // Use heading role to avoid strict-mode clash with the sr-only <p role="status">.
  await expect(page.getByRole('heading', { name: /Ordenanza de Estabilización de Rentas/ })).toBeVisible();
});
