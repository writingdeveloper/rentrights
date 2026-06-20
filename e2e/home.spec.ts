import { test, expect } from '@playwright/test';

/**
 * Phase 3 home-page IA tests.
 * DO NOT run these in CI until Phase 5 — they require a live preview URL.
 */

test('home: hero headline is visible on first load', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /you have rights/i })).toBeVisible();
});

test('home: FAQ heading appears below the how-it-works section', async ({ page }) => {
  await page.goto('/');

  const howHeading = page.getByText('How it works');
  const faqHeading = page.getByRole('heading', { name: /frequently asked questions/i });

  await expect(howHeading).toBeVisible();
  await expect(faqHeading).toBeVisible();

  // FAQ must appear after how-it-works in the DOM
  const howBox = await howHeading.boundingBox();
  const faqBox = await faqHeading.boundingBox();
  expect(faqBox!.y).toBeGreaterThan(howBox!.y);
});

test('home: trust chips render with a date', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Updated \d{4}/)).toBeVisible();
  await expect(page.getByText('Public records')).toBeVisible();
  await expect(page.getByText('Free, nothing saved')).toBeVisible();
});

test('result: compact header shows after a successful lookup', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();

  // Wait for result to render
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible({ timeout: 15000 });

  // The wordmark should still be visible (compact form)
  await expect(page.getByText('RentRights').first()).toBeVisible();

  // The sr-only h1 with result.pageHeading is present in the DOM
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
});

test('home: loading skeleton appears while lookup is in progress', async ({ page }) => {
  await page.goto('/');

  // Slow down the API response so we can observe the skeleton
  await page.route('/api/lookup', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });

  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();

  // The role="status" from ResultSkeleton should be present during loading
  await expect(page.getByRole('status').first()).toBeAttached();
});

test('home: exactly one h1 on home (hero) and one on result (sr-only)', async ({ page }) => {
  await page.goto('/');

  const homeH1s = page.locator('h1');
  await expect(homeH1s).toHaveCount(1);
  await expect(homeH1s.first()).toHaveText(/you have rights/i);

  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill('1411 Murray Dr, Los Angeles, CA');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/Rent Stabilization Ordinance/)).toBeVisible({ timeout: 15000 });

  const resultH1s = page.locator('h1');
  await expect(resultH1s).toHaveCount(1);
});
