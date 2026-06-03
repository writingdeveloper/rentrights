# RentRights M2-C — Share Link / Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user share or save the current result as one link — the link encodes the inputs (address + confirming answers + locale) in the URL hash; opening it restores state and re-runs the lookup. No server storage, no DB, no accounts.

**Architecture:** A pure `encodeShare`/`decodeShare` codec (inputs ↔ URL-hash string via `URLSearchParams`), a client `ShareButton` (Web Share API → clipboard → text fallback), and a mount-time `useEffect` in `app/page.tsx` that decodes `window.location.hash`, restores state/locale, and auto-runs. Four new `share.*` i18n keys.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind, Vitest. Zero new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-02-rentrights-m2c-share-link-design.md`

**Conventions:** Import alias `@/*` = repo root. Tests under `tests/`. Pure functions unit-tested. Commit after every green step. Branch: `m2c-share-link` (already created). After each task run `npx tsc --noEmit` AND `npm test` — every commit must type-check and pass (Vitest transpiles without full type-checking, so `tsc` is the build gate).

---

## File Structure

- `lib/share/code.ts` — CREATE: `ShareState`, `encodeShare`, `decodeShare` (pure)
- `components/ShareButton.tsx` — CREATE: client share/copy button + privacy note
- `app/page.tsx` — MODIFY: mount-time hash restore + render `<ShareButton>`
- `messages/en.json`, `messages/es.json` — MODIFY: add `share.*` keys
- `tests/share/code.test.ts` — CREATE: codec round-trip + edge cases

---

## Task 1: Share codec (`encodeShare` / `decodeShare`)

**Files:**
- Create: `lib/share/code.ts`
- Test: `tests/share/code.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/share/code.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare, ShareState } from '@/lib/share/code';

describe('encodeShare / decodeShare round-trip', () => {
  it('round-trips address + answers + locale (with leading #)', () => {
    const s: ShareState = {
      address: '1411 Murray Dr, Los Angeles, CA',
      answers: { builtBeforeOct1978: true, isCondo: false },
      locale: 'es',
    };
    expect(decodeShare('#' + encodeShare(s))).toEqual(s);
  });

  it('round-trips a unicode address with no answers and no locale', () => {
    const s: ShareState = { address: '123 Calle Ñandú #4', answers: {} };
    const decoded = decodeShare(encodeShare(s));
    expect(decoded?.address).toBe('123 Calle Ñandú #4');
    expect(decoded?.answers).toEqual({});
    expect(decoded?.locale).toBeUndefined();
  });

  it('encodes only the answers that are set', () => {
    const hash = encodeShare({ address: 'x', answers: { isSeparateHouse: true } });
    expect(hash).toContain('s=1');
    expect(hash).not.toContain('b=');
    expect(hash).not.toContain('c=');
    expect(hash).not.toContain('e=');
  });

  it('maps the short answer keys correctly', () => {
    const decoded = decodeShare('a=x&b=1&c=0');
    expect(decoded?.answers).toEqual({ builtBeforeOct1978: true, isCondo: false });
  });

  it('returns null for an empty or address-less hash', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('#')).toBeNull();
    expect(decodeShare('lang=es&b=1')).toBeNull();
    expect(decodeShare('a=%20%20')).toBeNull();
  });

  it('ignores an invalid lang value', () => {
    expect(decodeShare('a=x&lang=fr')?.locale).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/share/code.test.ts`
Expected: FAIL — cannot find module `@/lib/share/code`.

- [ ] **Step 3: Implement the codec**

Create `lib/share/code.ts`:
```ts
import { UserAnswers } from '@/lib/rules/types';
import { Locale } from '@/lib/i18n/catalog';

export interface ShareState {
  address: string;
  answers: UserAnswers;
  locale?: Locale;
}

// Short hash keys ↔ UserAnswers boolean fields.
const ANSWER_KEYS: { param: string; field: keyof UserAnswers }[] = [
  { param: 'b', field: 'builtBeforeOct1978' },
  { param: 's', field: 'isSeparateHouse' },
  { param: 'e', field: 'hasAb1482ExemptionNotice' },
  { param: 'c', field: 'isCondo' },
];

export function encodeShare(s: ShareState): string {
  const params = new URLSearchParams();
  params.set('a', s.address);
  if (s.locale) params.set('lang', s.locale);
  for (const { param, field } of ANSWER_KEYS) {
    const v = s.answers[field];
    if (v !== undefined) params.set(param, v ? '1' : '0');
  }
  return params.toString();
}

export function decodeShare(hash: string): ShareState | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const address = params.get('a')?.trim();
  if (!address) return null;

  const answers: UserAnswers = {};
  for (const { param, field } of ANSWER_KEYS) {
    const v = params.get(param);
    if (v === '1') answers[field] = true;
    else if (v === '0') answers[field] = false;
  }

  const lang = params.get('lang');
  const locale: Locale | undefined = lang === 'en' || lang === 'es' ? lang : undefined;

  const out: ShareState = { address, answers };
  if (locale) out.locale = locale;
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/share/code.test.ts`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**
```powershell
git add lib/share/code.ts tests/share/code.test.ts
git commit -m "feat(share): pure encodeShare/decodeShare URL-hash codec"
```

---

## Task 2: Add `share.*` i18n keys

**Files:**
- Modify: `messages/en.json`, `messages/es.json`

- [ ] **Step 1: Add the English keys**

In `messages/en.json`, add these four keys (place them after the `meta.description` entry; the file is a flat JSON object — add a comma after the previous last entry as needed):
```json
  "share.button": "Copy link",
  "share.copied": "Copied!",
  "share.privacyNote": "This link includes the address you entered.",
  "share.shareTitle": "My LA renter-rights estimate"
```

- [ ] **Step 2: Add the Spanish keys**

In `messages/es.json`, add the matching keys:
```json
  "share.button": "Copiar enlace",
  "share.copied": "¡Copiado!",
  "share.privacyNote": "Este enlace incluye la dirección que ingresó.",
  "share.shareTitle": "Mi estimación de derechos de inquilino en LA"
```

- [ ] **Step 3: Verify catalog parity + suite**

Run: `npx vitest run tests/i18n/catalog.test.ts` then `npm test` then `npx tsc --noEmit`
Expected: catalog completeness test passes (en/es key sets still identical), full suite green, tsc clean.

- [ ] **Step 4: Commit**
```powershell
git add messages/en.json messages/es.json
git commit -m "feat(i18n): share.* catalog keys (en/es)"
```

---

## Task 3: ShareButton component

**Files:**
- Create: `components/ShareButton.tsx`

> No unit test (browser-API-driven UI; the codec it relies on is tested in Task 1, and the share flow is verified in Task 5's Chrome QA).

- [ ] **Step 1: Create the component**

Create `components/ShareButton.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { encodeShare } from '@/lib/share/code';
import { UserAnswers } from '@/lib/rules/types';
import { Locale } from '@/lib/i18n/catalog';
import { useT } from '@/lib/i18n/LocaleProvider';

export function ShareButton({ address, answers, locale }: { address: string; answers: UserAnswers; locale: Locale }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  async function onShare() {
    const url = `${window.location.origin}${window.location.pathname}#${encodeShare({ address, answers, locale })}`;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: t('share.shareTitle'), url });
        return;
      }
    } catch (e) {
      // User canceled the native share sheet (AbortError) or it failed — fall through to clipboard.
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallbackUrl(url);
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={onShare} className="rounded-lg border px-3 py-1 text-sm font-semibold">
        {copied ? t('share.copied') : t('share.button')}
      </button>
      <p className="mt-1 text-xs text-gray-500">{t('share.privacyNote')}</p>
      {fallbackUrl && (
        <input
          readOnly
          value={fallbackUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-2 w-full rounded border px-2 py-1 text-xs text-gray-600"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**
```powershell
git add components/ShareButton.tsx
git commit -m "feat(share): ShareButton (web-share/clipboard/text fallback) + privacy note"
```

---

## Task 4: Page integration — restore on load + render button

**Files:**
- Modify: `app/page.tsx`

The current `app/page.tsx` is a client component with `address`/`answers`/`data`/`error`/`loading` state, a `run(addr, ans)` function, `useT()` and `useLocale()`. You will add a mount-time restore effect and render the button in the result block.

- [ ] **Step 1: Add imports**

In `app/page.tsx`, change the React import to include `useEffect`:
```tsx
import { useState } from 'react';
```
becomes:
```tsx
import { useEffect, useState } from 'react';
```
Add these imports alongside the existing component imports:
```tsx
import { ShareButton } from '@/components/ShareButton';
import { decodeShare } from '@/lib/share/code';
```

- [ ] **Step 2: Add the restore-on-load effect**

In `app/page.tsx`, immediately after the state declarations (after the `const [loading, setLoading] = useState(false);` line) and BEFORE the `async function run(...)`, add:
```tsx
  useEffect(() => {
    const s = decodeShare(window.location.hash);
    if (!s) return;
    setAddress(s.address);
    setAnswers(s.answers);
    if (s.locale) setLocale(s.locale);
    run(s.address, s.answers);
    // Mount-only: restore shared state once from the URL hash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 3: Render the ShareButton in the result block**

In `app/page.tsx`, inside the `{data && ( ... )}` block, add the `<ShareButton>` right before the `<GetHelp ... />` line. Change:
```tsx
          <GetHelp unincorporatedCounty={data.jurisdiction?.placeName === null} />
```
to:
```tsx
          <ShareButton address={address} answers={answers} locale={locale} />
          <GetHelp unincorporatedCounty={data.jurisdiction?.placeName === null} />
```

- [ ] **Step 4: Build + suite + tsc**

Run: `npm run build` then `npm test` then `npx tsc --noEmit`
Expected: build succeeds, all tests pass, tsc clean.

- [ ] **Step 5: Commit**
```powershell
git add app/page.tsx
git commit -m "feat(share): restore shared state from URL hash on load + render ShareButton"
```

---

## Task 5: Verification (full-site Claude-in-Chrome QA) + finish

**Files:** none (verification + branch completion)

> Per the standing requirement (memory: rentrights-full-site-chrome-qa), every change is QA'd from the user's perspective in a real browser, all parts of the site in order.

- [ ] **Step 1: Full suite + build + tsc**

Run: `npm test` then `npm run build` then `npx tsc --noEmit`
Expected: all green. (Note: `/` is DYNAMIC — expected since M2-B's layout reads cookies()/headers(); not a regression.)

- [ ] **Step 2: Claude-in-Chrome full-site sequential QA**

Start a FRESH dev server (kill any stale one first — `Stop-Process` the PID Next reports as already running; Next 16 allows only one dev server per dir). Open a fresh tab via the claude-in-chrome tools and step through, screenshotting each:
1. Load `http://localhost:3000` → English page with EN/ES toggle.
2. Enter `1411 Murray Dr, Los Angeles, CA` → RSO result (Built 1931, 6 units, "up to 3%", High confidence), get-help directory renders.
3. Toggle **Español** → entire result re-renders in Spanish; reload → stays Spanish (cookie).
4. Enter an unincorporated-county address (e.g. `1000 N Eastern Ave, East Los Angeles, CA`) → unincorporated-county message.
5. Enter gibberish → friendly "address not found" error (localized).
6. (Back in English) confirm a confirming-questions scenario renders + answering re-runs.
7. **Share round-trip:** on a result, click **Copy link** (confirm "Copied!" feedback + the privacy note is visible); read the generated URL (use the clipboard value or the page) ; open that exact `#...` hash URL in a NEW tab → confirm address, answers, and language are restored and the same result renders automatically.
8. Confirm the privacy note text is present near the share button.

If any step misbehaves, stop and report (do not keep retrying blindly).

- [ ] **Step 3: Complete the development branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests, present merge/PR/keep/discard options, and execute the choice.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §2.1 codec → Task 1. §2.4 i18n keys → Task 2. §2.2 ShareButton (web-share→clipboard→text fallback, copied feedback, privacy note) → Task 3. §2.3 page restore-on-load + button render → Task 4. §5 tests: codec round-trip/edge → Task 1; catalog parity → Task 2; full-site Chrome QA → Task 5. No-DB/no-account, hash carrier, no URL auto-sync, snapshot/server-storage excluded → respected (no such tasks).
- **Placeholder scan:** No "TBD/TODO". Every code/JSON block is complete and concrete. The ShareButton has no unit test by design (browser-API UI), justified inline; its codec dependency is fully tested in Task 1 and the flow is verified in Task 5.
- **Type consistency:** `ShareState { address; answers: UserAnswers; locale?: Locale }` defined in Task 1, consumed identically by `ShareButton` (Task 3, props `address/answers/locale: Locale`) and `decodeShare` use in page (Task 4). `encodeShare(ShareState): string` and `decodeShare(string): ShareState | null` signatures match across definition and all call sites. Short-key map (`a/lang/b/s/e/c`) is internal to `code.ts` and consistent between encode and decode. `share.button/copied/privacyNote/shareTitle` keys added in Task 2 exactly match the `t('share.*')` calls in Task 3. `useEffect` added to the React import in Task 4 before use.
- **Green-at-every-commit:** Task 1 (pure module, no consumers) and Task 2 (additive keys) don't touch the app; Task 3 adds an unmounted component; Task 4 wires it. `tsc`+`npm test` gate each task.

## Out of M2-C scope → future
- **M2-D:** Playwright E2E (incl. share round-trip) + component tests. **M3:** County RSTPO classification, rent-increase legality checker, deploy hardening. **Parallel:** ES legal terminology + get-help data review ([[rentrights-gethelp-needs-legal-signoff]]).
