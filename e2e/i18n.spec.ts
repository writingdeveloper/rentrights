import { test, expect } from '@playwright/test';

test('toggle to Spanish re-renders the result and persists via cookie', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible();

  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page.getByText(/Ordenanza de Estabilización de Rentas/)).toBeVisible();

  await page.reload();
  // After reload the cookie keeps Spanish: the tagline is Spanish and Español is pressed.
  await expect(page.getByText(/Conozca sus derechos/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true');
});
