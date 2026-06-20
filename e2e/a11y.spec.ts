import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Phase 5 axe-core accessibility gate.
 *
 * Checks both HOME and RESULT page states, in both locales (en/es) and
 * both color schemes (light/dark).  Asserts zero serious/critical violations.
 *
 * Address used: 1411 Murray Drive, Los Angeles, CA — a pre-1978 RSO address
 * that returns a deterministic RSO result (same pattern as the other specs).
 */

// Measure the settled accessible state: disable the result card's fade-in
// (.result-reveal opacity animation) so axe never samples a mid-transition,
// partially transparent (blended -> low-contrast) frame. Reduced-motion users
// get this same final state, and the settled colors are what people actually read.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const TEST_ADDRESS = '1411 Murray Dr, Los Angeles, CA';
// EN result: the heading h2 with the regime title
const RESULT_HEADING_EN = /Rent Stabilization Ordinance/;
// ES result: use the heading role to avoid matching the sr-only <p role="status">
const RESULT_HEADING_ES = 'Ordenanza de Estabilización de Rentas';
// For backward compat in lookupRSO which waits in English
const RESULT_TEXT_EN = RESULT_HEADING_EN;

/** Run axe on the current page and assert no serious/critical violations. */
async function assertNoA11yViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    // Exclude the axe-generated skip-link injection itself to avoid false positives.
    .exclude('[id^="axe-"]')
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  if (blocking.length > 0) {
    const summary = blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n` +
          v.nodes
            .slice(0, 3)
            .map((n) => `  - ${n.target.join(', ')}: ${n.failureSummary}`)
            .join('\n'),
      )
      .join('\n\n');
    throw new Error(`${blocking.length} axe violation(s):\n\n${summary}`);
  }

  // Soft-report warnings (moderate/minor) without failing.
  const warnings = results.violations.filter(
    (v) => v.impact !== 'critical' && v.impact !== 'serious',
  );
  if (warnings.length > 0) {
    console.warn(
      `[a11y] ${warnings.length} moderate/minor axe warning(s) (non-blocking):`,
      warnings.map((v) => `${v.id} (${v.impact})`),
    );
  }
}

/** Type the address and wait for the RSO result card (EN). */
async function lookupRSO(page: import('@playwright/test').Page) {
  await page.getByPlaceholder('1234 S Main St, Los Angeles').fill(TEST_ADDRESS);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(RESULT_TEXT_EN)).toBeVisible({ timeout: 20_000 });
}

// ---------------------------------------------------------------------------
// HOME page — light + dark, en + es
// ---------------------------------------------------------------------------

test.describe('a11y: home page (light)', () => {
  test.use({ colorScheme: 'light' });

  test('home EN — no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /you have rights/i })).toBeVisible();
    await assertNoA11yViolations(page);
  });

  test('home ES — no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Español' }).click();
    // Spanish hero headline (hero.headline in es.json = "Usted tiene derechos.")
    await expect(page.getByRole('heading', { level: 1, name: /Usted tiene derechos/i})).toBeVisible();
    await assertNoA11yViolations(page);
  });
});

test.describe('a11y: home page (dark)', () => {
  test.use({ colorScheme: 'dark' });

  test('home EN — no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /you have rights/i })).toBeVisible();
    await assertNoA11yViolations(page);
  });

  test('home ES — no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Usted tiene derechos/i})).toBeVisible();
    await assertNoA11yViolations(page);
  });
});

// ---------------------------------------------------------------------------
// RESULT page — light + dark, en + es
// ---------------------------------------------------------------------------

test.describe('a11y: result page (light)', () => {
  test.use({ colorScheme: 'light' });

  test('result EN — no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    await lookupRSO(page);
    await assertNoA11yViolations(page);
  });

  test('result ES — no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    await lookupRSO(page);
    // Switch to Spanish and wait for the heading (avoids strict-mode clash with sr-only p).
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.getByRole('heading', { name: RESULT_HEADING_ES })).toBeVisible({ timeout: 10_000 });
    await assertNoA11yViolations(page);
  });
});

test.describe('a11y: result page (dark)', () => {
  test.use({ colorScheme: 'dark' });

  test('result EN — no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    await lookupRSO(page);
    await assertNoA11yViolations(page);
  });

  test('result ES — no serious/critical violations', async ({ page }) => {
    await page.goto('/');
    await lookupRSO(page);
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.getByRole('heading', { name: RESULT_HEADING_ES })).toBeVisible({ timeout: 10_000 });
    await assertNoA11yViolations(page);
  });
});
