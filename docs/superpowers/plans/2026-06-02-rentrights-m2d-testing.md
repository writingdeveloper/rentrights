# RentRights M2-D — Playwright E2E + Component Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate the previously-manual QA flows with two test layers — offline-deterministic component tests (Vitest + React Testing Library + jsdom) and live end-to-end tests (Playwright against the production build + live Census/Assessor APIs).

**Architecture:** Component tests render each UI component wrapped in `<LocaleProvider>` and assert rendering/interaction (no network), running inside the existing Vitest suite via a per-file `// @vitest-environment jsdom` pragma. Playwright drives a real Chromium against `next build && next start` hitting the real external APIs, in a separate `npm run e2e` command.

**Tech Stack:** Next.js 16, TypeScript, Vitest (existing), `@testing-library/react` + `jsdom` (new), `@playwright/test` (new).

**Spec:** `docs/superpowers/specs/2026-06-02-rentrights-m2d-testing-design.md`

**Conventions:** Import alias `@/*` = repo root. Component tests under `tests/components/`; E2E under `e2e/`. Commit after every green step. Branch: `m2d-testing` (already created). After each task run `npx tsc --noEmit`; for component-test tasks also `npm test`. `npm test` must stay offline + fast.

**Key project facts (verified):**
- `vitest.config.ts` = `{ test: { environment: 'node' }, resolve: { alias: { '@': repoRoot } } }`. Component tests opt into jsdom per-file via the pragma.
- Components (all client, use `useT()` from `@/lib/i18n/LocaleProvider`):
  - `ResultCard({ result })` — renders `rightsText`/`capLabel`/`capStaleness`/`stalenessMessage`, reasons via `t('reason.'+code, params)`, confidence/cap only for non-OOJ/non-UNKNOWN.
  - `ConfirmingQuestions({ questions, answers, onAnswer })` — renders `t('question.'+id+'.{q,yes,no}')`; clicking calls `onAnswer({ ...answers, [field]: bool })`.
  - `GetHelp({ unincorporatedCounty? })` — `orgsFor(...)`, renders `o.name` + `t(o.descriptionKey)`; county-first when flagged.
  - `ShareButton({ address, answers, locale })` — builds `origin+pathname+'#'+encodeShare(...)`, web-share→clipboard→text fallback, "Copied!" feedback, privacy note.
  - `Disclaimer({ lastVerified })` — `t('disclaimer.text', { lastVerified })`.
- The Spanish placeholder is 2 lines; the English placeholder is `1234 S Main St, Los Angeles`; the check button is `Check` (en) / `Consultar` (es); toggle buttons are `English` / `Español` with `aria-pressed`.

---

## File Structure

- `tests/components/resultcard.test.tsx`, `disclaimer.test.tsx`, `confirmingquestions.test.tsx`, `gethelp.test.tsx`, `sharebutton.test.tsx` — CREATE (jsdom component tests)
- `playwright.config.ts` — CREATE (E2E runner config)
- `e2e/lookup.spec.ts`, `e2e/i18n.spec.ts`, `e2e/share.spec.ts` — CREATE (live E2E)
- `package.json` — MODIFY (add `e2e`, `e2e:install` scripts + devDeps)
- `.gitignore` — MODIFY (ignore Playwright/test artifacts)

---

## Task 1: Component-test infra + ResultCard + Disclaimer

**Files:**
- Modify: `package.json` (devDeps)
- Create: `tests/components/resultcard.test.tsx`, `tests/components/disclaimer.test.tsx`

- [ ] **Step 1: Install component-test dependencies**

Run:
```powershell
npm install -D @testing-library/react @testing-library/dom jsdom
```
Expected: the three packages added to devDependencies (RTL v16 supports React 19).

- [ ] **Step 2: Write the Disclaimer component test (simplest, proves the jsdom infra)**

Create `tests/components/disclaimer.test.tsx`:
```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Disclaimer } from '@/components/Disclaimer';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

describe('Disclaimer', () => {
  it('renders localized text including the lastVerified date', () => {
    render(
      <LocaleProvider initialLocale="en">
        <Disclaimer lastVerified="2026-06-02" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/2026-06-02/)).toBeTruthy();
    expect(screen.getByText(/not legal advice/i)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the Disclaimer test (verifies jsdom + RTL work)**

Run: `npx vitest run tests/components/disclaimer.test.tsx`
Expected: 1 passed. (If it fails to find the DOM, confirm the `// @vitest-environment jsdom` pragma is the very first line.)

- [ ] **Step 4: Write the ResultCard component test**

Create `tests/components/resultcard.test.tsx`:
```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ResultCard } from '@/components/ResultCard';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { RegimeResult } from '@/lib/rules/types';

afterEach(cleanup);

function renderCard(result: RegimeResult) {
  return render(
    <LocaleProvider initialLocale="en">
      <ResultCard result={result} />
    </LocaleProvider>,
  );
}

describe('ResultCard', () => {
  it('renders an RSO result with reasons, confidence, and the cap label', () => {
    renderCard({
      regime: 'RSO',
      confidence: 'high',
      reasons: [
        { code: 'IN_LA_CITY' },
        { code: 'BUILT_BEFORE_CUTOFF', params: { year: 1931 } },
        { code: 'UNITS_COUNT', params: { count: 6 } },
      ],
      questions: [],
    });
    expect(screen.getByText(/Rent Stabilization Ordinance/)).toBeTruthy();
    expect(screen.getByText('High confidence')).toBeTruthy();
    expect(screen.getByText(/Built in 1931/)).toBeTruthy();
    expect(screen.getByText(/6 units on the parcel/)).toBeTruthy();
    expect(screen.getByText(/Legal annual increase/)).toBeTruthy();
  });

  it('hides the confidence and cap section for OUT_OF_JURISDICTION', () => {
    renderCard({
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: 'West Hollywood city' } }],
      questions: [],
    });
    expect(screen.getByText(/Outside the City of Los Angeles/)).toBeTruthy();
    expect(screen.queryByText('High confidence')).toBeNull();
    expect(screen.queryByText(/Legal annual increase/)).toBeNull();
  });
});
```

- [ ] **Step 5: Run both component tests + full suite + tsc**

Run: `npx vitest run tests/components/` then `npm test` then `npx tsc --noEmit`
Expected: component tests pass; full suite green (existing 69 + new); tsc clean.

- [ ] **Step 6: Commit**
```powershell
git add package.json package-lock.json tests/components/disclaimer.test.tsx tests/components/resultcard.test.tsx
git commit -m "test(components): jsdom infra + ResultCard and Disclaimer tests"
```

---

## Task 2: ConfirmingQuestions + GetHelp + ShareButton component tests

**Files:**
- Create: `tests/components/confirmingquestions.test.tsx`, `tests/components/gethelp.test.tsx`, `tests/components/sharebutton.test.tsx`

- [ ] **Step 1: Write the ConfirmingQuestions test**

Create `tests/components/confirmingquestions.test.tsx`:
```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ConfirmingQuestions } from '@/components/ConfirmingQuestions';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

function renderQs(onAnswer: (a: unknown) => void) {
  render(
    <LocaleProvider initialLocale="en">
      <ConfirmingQuestions questions={['IS_CONDO']} answers={{}} onAnswer={onAnswer} />
    </LocaleProvider>,
  );
}

describe('ConfirmingQuestions', () => {
  it('renders the condo question and reports true for the yes option', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer);
    expect(screen.getByText(/individually-owned condominium/)).toBeTruthy();
    fireEvent.click(screen.getByText('Yes, a condo'));
    expect(onAnswer).toHaveBeenCalledWith({ isCondo: true });
  });

  it('reports false for the no option', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer);
    fireEvent.click(screen.getByText('No, a rental apartment'));
    expect(onAnswer).toHaveBeenCalledWith({ isCondo: false });
  });
});
```

- [ ] **Step 2: Write the GetHelp test**

Create `tests/components/gethelp.test.tsx`:
```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GetHelp } from '@/components/GetHelp';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(cleanup);

describe('GetHelp', () => {
  it('renders the directory heading and the LAHD entry', () => {
    render(
      <LocaleProvider initialLocale="en">
        <GetHelp />
      </LocaleProvider>,
    );
    expect(screen.getByText('Get free help')).toBeTruthy();
    expect(screen.getByText(/LAHD/)).toBeTruthy();
  });

  it('surfaces a County (DCBA) resource first for unincorporated county', () => {
    render(
      <LocaleProvider initialLocale="en">
        <GetHelp unincorporatedCounty />
      </LocaleProvider>,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain('DCBA');
  });
});
```

- [ ] **Step 3: Write the ShareButton test (mock clipboard)**

Create `tests/components/sharebutton.test.tsx`:
```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButton } from '@/components/ShareButton';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(() => {
  cleanup();
  // remove the clipboard stub between tests
  delete (navigator as unknown as { clipboard?: unknown }).clipboard;
});

describe('ShareButton', () => {
  it('copies a hash link to the clipboard and shows the copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(
      <LocaleProvider initialLocale="en">
        <ShareButton address="1411 Murray Dr" answers={{}} locale="en" />
      </LocaleProvider>,
    );
    expect(screen.getByText(/includes the address you entered/i)).toBeTruthy();
    fireEvent.click(screen.getByText('Copy link'));
    await waitFor(() => expect(screen.getByText('Copied!')).toBeTruthy());
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('#a=1411');
  });
});
```
> Note: jsdom does not implement `navigator.clipboard` or `navigator.share` by default, so `Object.defineProperty` adds the clipboard mock and `navigator.share` stays `undefined` (ShareButton then takes the clipboard branch). The default jsdom URL is `http://localhost/`, so the copied link starts with `http://localhost/#a=...`.

- [ ] **Step 4: Run the new tests + full suite + tsc**

Run: `npx vitest run tests/components/` then `npm test` then `npx tsc --noEmit`
Expected: all component tests pass; full suite green; tsc clean.

- [ ] **Step 5: Commit**
```powershell
git add tests/components/confirmingquestions.test.tsx tests/components/gethelp.test.tsx tests/components/sharebutton.test.tsx
git commit -m "test(components): ConfirmingQuestions, GetHelp, ShareButton tests"
```

---

## Task 3: Playwright setup + lookup E2E

**Files:**
- Modify: `package.json` (devDep + scripts), `.gitignore`
- Create: `playwright.config.ts`, `e2e/lookup.spec.ts`

- [ ] **Step 1: Install Playwright + the Chromium browser**

Run:
```powershell
npm install -D @playwright/test
npx playwright install chromium
```
Expected: `@playwright/test` in devDependencies; Chromium downloaded.

- [ ] **Step 2: Add scripts to `package.json`**

In `package.json` `"scripts"`, add:
```json
"e2e": "playwright test",
"e2e:install": "playwright install chromium"
```

- [ ] **Step 3: Ignore Playwright artifacts**

Append to `.gitignore`:
```
# Playwright
/test-results/
/playwright-report/
/playwright/.cache/
```

- [ ] **Step 4: Create `playwright.config.ts`**

Create `playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    timeout: 180_000,
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 5: Create the lookup E2E spec**

Create `e2e/lookup.spec.ts`:
```ts
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
  await expect(page.getByText(/unincorporated LA County/i)).toBeVisible();
  await expect(page.getByText(/DCBA/)).toBeVisible();
});
```

- [ ] **Step 6: Verify the specs compile/are discovered (no run yet)**

Run: `npx playwright test --list` then `npx tsc --noEmit`
Expected: the 3 lookup tests are listed (config + spec compile); tsc clean. (Full live run happens in Task 5.)

- [ ] **Step 7: Commit**
```powershell
git add package.json package-lock.json .gitignore playwright.config.ts e2e/lookup.spec.ts
git commit -m "test(e2e): Playwright setup + lookup specs (RSO, error, unincorporated)"
```

---

## Task 4: i18n + share E2E specs

**Files:**
- Create: `e2e/i18n.spec.ts`, `e2e/share.spec.ts`

- [ ] **Step 1: Create the i18n E2E spec**

Create `e2e/i18n.spec.ts`:
```ts
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
```

- [ ] **Step 2: Create the share E2E spec**

Create `e2e/share.spec.ts`:
```ts
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
  await expect(page2.getByDisplayValue('1411 Murray Dr, Los Angeles, CA')).toBeVisible();
  await expect(page2.getByText(/Rent Stabilization Ordinance/)).toBeVisible();
});

test('a Spanish share link renders the result in Spanish', async ({ page }) => {
  await page.goto('/#a=1411+Murray+Dr%2C+Los+Angeles%2C+CA&lang=es');
  await expect(page.getByText(/Ordenanza de Estabilización de Rentas/)).toBeVisible();
});
```

- [ ] **Step 3: Verify discovery + tsc**

Run: `npx playwright test --list` then `npx tsc --noEmit`
Expected: all 6 E2E tests listed (3 lookup + 1 i18n + 2 share); tsc clean.

- [ ] **Step 4: Commit**
```powershell
git add e2e/i18n.spec.ts e2e/share.spec.ts
git commit -m "test(e2e): i18n toggle/cookie + share link round-trip specs"
```

---

## Task 5: Full verification + finish

**Files:** none (verification + branch completion)

- [ ] **Step 1: Offline suite + types + build**

Run: `npm test` then `npx tsc --noEmit` then `npm run build`
Expected: all Vitest (unit + component) green; tsc clean; build succeeds (`/` dynamic, expected).

- [ ] **Step 2: Run the live E2E suite once**

Run: `npm run e2e`
Expected: Playwright builds + starts the production server, then all 6 tests pass against live Census/Assessor APIs (retries allowed for transient external-API slowness). If a test fails only due to an external-API timeout (not an assertion mismatch), note it as a live-API flake, not a code defect — re-run once. If an assertion genuinely fails, stop and report.

- [ ] **Step 3: Smoke Claude-in-Chrome check (standing requirement, abbreviated)**

Per memory `rentrights-full-site-chrome-qa`: since this pack changes no app UI (only adds tests), a single smoke pass suffices. Start the production server (`npm run build && npx next start -p 3000` — NOT `next dev`, which is broken on this machine), open a fresh tab, load `http://localhost:3000`, run one address lookup, and confirm the result renders. (The detailed flows are now covered by the E2E suite from Step 2.)

- [ ] **Step 4: Complete the development branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests, present merge/PR/keep/discard options, and execute the choice.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §2.1 jsdom infra → Task 1 (deps + pragma + cleanup). §2.2 5 component tests → Task 1 (ResultCard, Disclaimer) + Task 2 (ConfirmingQuestions, GetHelp, ShareButton). §2.3 Playwright infra/config → Task 3. §2.4 E2E specs (lookup/i18n/share) → Tasks 3–4; confirming-questions covered by the ConfirmingQuestions component test (Task 2), E2E omission is intentional & documented (live data can't guarantee a question-triggering address). §2.5 scripts + .gitignore → Task 3. §5 verification (`npm test`, `npm run e2e`, build, smoke QA) → Task 5. CI deferred to M3 (no CI task — correct).
- **Placeholder scan:** No "TBD/TODO". Every test/code/config block is complete and concrete. The "best-effort confirming-questions E2E" is explicitly replaced by a deterministic component test, not left as a vague gap.
- **Type/locator consistency:** Component props match the real signatures (`ResultCard({result})`, `ConfirmingQuestions({questions,answers,onAnswer})`, `GetHelp({unincorporatedCounty})`, `ShareButton({address,answers,locale})`, `Disclaimer({lastVerified})`). Reason codes used in fixtures (`IN_LA_CITY`, `BUILT_BEFORE_CUTOFF`, `UNITS_COUNT`, `OUT_OF_LA_CITY`) exist in `ReasonCode` and have `reason.*` catalog keys. E2E locators (`getByPlaceholder('1234 S Main St, Los Angeles')`, button names `Check`/`Español`/`Copy link`, `getByDisplayValue`) match the real EN UI strings. Date-dependent cap % is deliberately not asserted (avoids a post-2026-06-30 time-bomb).
- **Offline/online split:** `npm test` stays node+jsdom offline (no Playwright in it); live external calls only in `npm run e2e`. Component tests mock browser-only APIs (`navigator.clipboard`).

## Out of M2-D scope → future
- **M3:** CI workflow (offline `npm test` as PR gate; live `e2e` nightly/manual), County RSTPO classification, rent-increase legality checker, deploy hardening. **Parallel:** ES legal terminology + get-help data review ([[rentrights-gethelp-needs-legal-signoff]]).
