import { test, expect } from '@playwright/test';

test('toggle to Spanish re-renders the result and persists via cookie', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible();

  await page.getByRole('button', { name: 'Español' }).click();
  // Use heading role to avoid matching the sr-only <p role="status"> that also carries this text.
  // Allow up to 10s because the locale switch re-renders after the API response settles.
  await expect(page.getByRole('heading', { name: /Ordenanza de Estabilización de Rentas/ })).toBeVisible({ timeout: 10_000 });

  await page.reload();
  // After reload the cookie keeps Spanish: the hero headline is Spanish and Español is pressed.
  // ("Usted tiene derechos." is the Spanish hero.headline after the usted-register
  //  normalization; the old "Conozca sus derechos" key no longer renders.)
  await expect(page.getByText(/Usted tiene derechos/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Español' })).toHaveAttribute('aria-pressed', 'true');
});
