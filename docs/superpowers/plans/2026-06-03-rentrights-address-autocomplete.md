# M4-B Address Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add address autocomplete to the home input using LA County's CAMS locator `/suggest`, so renters pick a full address (with city) instead of hitting the missing-city dead-end.

**Architecture:** A `fetchSuggestions` client (CAMS `/suggest`) → a thin server proxy route `GET /api/suggest` → a client `AddressAutocomplete` combobox wired into the home form. Free-text submit is preserved. Green at every commit (client → route → i18n → component → wiring).

**Tech Stack:** Next.js 16 App Router (`runtime='nodejs'` route handlers), React 19, Tailwind, Vitest (node + jsdom).

Spec: `docs/superpowers/specs/2026-06-03-rentrights-address-autocomplete-design.md`.

---

## Task 1: CAMS suggestions client

**Files:**
- Modify: `lib/clients/cams.ts`
- Test: `tests/clients/cams.test.ts`

- [ ] **Step 1: Write failing tests.** Append to `tests/clients/cams.test.ts` (add `vi` to the existing `vitest` import if missing, and add `parseSuggestions, fetchSuggestions, shouldSuggest` to the existing `@/lib/clients/cams` import):

```ts
describe('parseSuggestions', () => {
  it('extracts the suggestion text labels (capped at 5)', () => {
    const json = { suggestions: [{ text: 'A, Los Angeles, CA' }, { text: 'B, Long Beach, CA' }] };
    expect(parseSuggestions(json)).toEqual(['A, Los Angeles, CA', 'B, Long Beach, CA']);
  });
  it('returns [] on error or malformed payloads', () => {
    expect(parseSuggestions({ error: { code: 400 } })).toEqual([]);
    expect(parseSuggestions({})).toEqual([]);
    expect(parseSuggestions(null)).toEqual([]);
  });
});

describe('shouldSuggest', () => {
  it('requires at least 4 non-space characters', () => {
    expect(shouldSuggest('300')).toBe(false);
    expect(shouldSuggest('   abc ')).toBe(false);
    expect(shouldSuggest('3000')).toBe(true);
  });
});

describe('fetchSuggestions', () => {
  it('returns [] for a short query without calling fetch', async () => {
    const f = vi.fn();
    expect(await fetchSuggestions('300', f as unknown as typeof fetch)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
  it('queries CAMS /suggest and returns the labels', async () => {
    let url = '';
    const f = async (u: string) => {
      url = u;
      return { ok: true, json: async () => ({ suggestions: [{ text: 'X, Los Angeles, CA' }] }) } as unknown as Response;
    };
    expect(await fetchSuggestions('300 s santa fe', f)).toEqual(['X, Los Angeles, CA']);
    expect(url).toContain('/suggest?text=');
    expect(url).toContain('maxSuggestions=5');
  });
});
```

- [ ] **Step 2: Run to verify failure.**

Run: `npx vitest run tests/clients/cams.test.ts`
Expected: FAIL (`parseSuggestions`/`fetchSuggestions`/`shouldSuggest` not exported).

- [ ] **Step 3: Implement.** Append to `lib/clients/cams.ts` (it already has `BASE` and `type FetchLike = (url: string) => Promise<Response>`):

```ts
const SUGGEST_MIN = 4;
const MAX_SUGGESTIONS = 5;

/** True when a query is long enough to ask CAMS for suggestions. */
export function shouldSuggest(text: string): boolean {
  return text.trim().length >= SUGGEST_MIN;
}

export function parseSuggestions(json: unknown): string[] {
  const j = json as { suggestions?: Array<{ text?: string }>; error?: unknown } | null;
  if (!j || j.error || !Array.isArray(j.suggestions)) return [];
  return j.suggestions
    .map((s) => s.text)
    .filter((t): t is string => typeof t === 'string')
    .slice(0, MAX_SUGGESTIONS);
}

/** Autocomplete labels (full addresses incl. city) for a partial address. */
export async function fetchSuggestions(text: string, fetchImpl: FetchLike = fetch): Promise<string[]> {
  if (!shouldSuggest(text)) return [];
  const url = `${BASE}/suggest?text=${encodeURIComponent(text.trim())}&maxSuggestions=${MAX_SUGGESTIONS}&f=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`CAMS suggest error: ${res.status}`);
  return parseSuggestions(await res.json());
}
```

- [ ] **Step 4: Run to verify pass.**

Run: `npx vitest run tests/clients/cams.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/clients/cams.ts tests/clients/cams.test.ts
git commit -m "feat(cams): fetchSuggestions for address autocomplete (/suggest)"
```

---

## Task 2: `/api/suggest` proxy route

**Files:**
- Create: `app/api/suggest/route.ts`

(Mirror the existing `app/api/lookup/route.ts` pattern: `export const runtime = 'nodejs'` + an async handler taking a `Request`. No offline test — it would call the live CAMS endpoint; correctness of the underlying logic is covered by Task 1, and the route end-to-end by Chrome QA.)

- [ ] **Step 1: Create `app/api/suggest/route.ts`:**

```ts
import { NextResponse } from 'next/server';
import { fetchSuggestions } from '@/lib/clients/cams';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  try {
    // fetchSuggestions already returns [] for queries shorter than 4 chars.
    const suggestions = await fetchSuggestions(q);
    return NextResponse.json({ suggestions });
  } catch {
    // Typing must never surface an error — degrade to no suggestions.
    return NextResponse.json({ suggestions: [] });
  }
}
```

- [ ] **Step 2: Verify it type-checks and builds.**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds; route `/api/suggest` appears in the route list.

- [ ] **Step 3: Commit.**

```bash
git add app/api/suggest/route.ts
git commit -m "feat(api): /api/suggest CAMS autocomplete proxy"
```

---

## Task 3: i18n strings for autocomplete

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

- [ ] **Step 1: Add two keys to `messages/en.json`** (next to the other `page.*` keys):

```json
  "suggest.loading": "Looking up addresses…",
  "suggest.none": "No matching address — try including the city",
```

- [ ] **Step 2: Add the same keys to `messages/es.json`:**

```json
  "suggest.loading": "Buscando direcciones…",
  "suggest.none": "No hay direcciones coincidentes — intente incluir la ciudad",
```

- [ ] **Step 3: Verify catalog parity.**

Run: `npx vitest run tests/i18n/catalog.test.ts`
Expected: PASS (identical key sets).

- [ ] **Step 4: Commit.**

```bash
git add messages/en.json messages/es.json
git commit -m "i18n(M4-B): suggest.loading / suggest.none"
```

---

## Task 4: `AddressAutocomplete` component

**Files:**
- Create: `components/AddressAutocomplete.tsx`
- Test: `tests/components/addressautocomplete.test.tsx`

- [ ] **Step 1: Write the failing test** `tests/components/addressautocomplete.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockFetch(suggestions: string[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestions }) }));
}

function Harness({ onSelect }: { onSelect: (a: string) => void }) {
  const [v, setV] = useState('');
  return (
    <LocaleProvider initialLocale="en">
      <AddressAutocomplete value={v} onChange={setV} onSelect={onSelect} />
    </LocaleProvider>
  );
}

describe('AddressAutocomplete', () => {
  it('shows suggestions after typing ≥4 chars', async () => {
    mockFetch(['300 South Santa Fe Avenue, Los Angeles, CA', '300 South Santa Fe Avenue, Long Beach, CA']);
    render(<Harness onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '300 s santa fe' } });
    expect(await screen.findByText('300 South Santa Fe Avenue, Los Angeles, CA')).toBeTruthy();
    expect(screen.getByText('300 South Santa Fe Avenue, Long Beach, CA')).toBeTruthy();
  });

  it('selecting a suggestion calls onSelect with the full label', async () => {
    mockFetch(['300 South Santa Fe Avenue, Los Angeles, CA']);
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '300 s santa fe' } });
    const opt = await screen.findByText('300 South Santa Fe Avenue, Los Angeles, CA');
    fireEvent.mouseDown(opt);
    expect(onSelect).toHaveBeenCalledWith('300 South Santa Fe Avenue, Los Angeles, CA');
  });

  it('ArrowDown + Enter selects the first suggestion', async () => {
    mockFetch(['300 South Santa Fe Avenue, Los Angeles, CA']);
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '300 s santa fe' } });
    await screen.findByText('300 South Santa Fe Avenue, Los Angeles, CA');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('300 South Santa Fe Avenue, Los Angeles, CA');
  });

  it('does not query or open for queries under 4 chars', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<Harness onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '300' } });
    await new Promise((r) => setTimeout(r, 350));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure.**

Run: `npx vitest run tests/components/addressautocomplete.test.tsx`
Expected: FAIL (component not found).

- [ ] **Step 3: Create `components/AddressAutocomplete.tsx`:**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n/LocaleProvider';

export function AddressAutocomplete({ value, onChange, onSelect }: {
  value: string;
  onChange: (text: string) => void;
  onSelect: (fullAddress: string) => void;
}) {
  const t = useT();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queried, setQueried] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 4) {
      setSuggestions([]);
      setOpen(false);
      setQueried(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (value.trim() !== q) return; // stale response — input moved on
        setSuggestions(Array.isArray(json.suggestions) ? json.suggestions : []);
      } catch {
        if (value.trim() !== q) return;
        setSuggestions([]);
      } finally {
        if (value.trim() === q) {
          setLoading(false);
          setQueried(true);
          setOpen(true);
          setActive(-1);
        }
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [value]);

  function choose(addr: string) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onChange(addr);
    setOpen(false);
    setSuggestions([]);
    onSelect(addr);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (active >= 0) {
        e.preventDefault();
        choose(suggestions[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && (loading || queried);
  return (
    <div className="relative flex-1">
      <input
        className="w-full rounded-lg border px-3 py-2"
        placeholder={t('page.placeholder')}
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-controls="address-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `addr-opt-${active}` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {showList && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {loading && suggestions.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-500">{t('suggest.loading')}</li>
          )}
          {!loading && queried && suggestions.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-500">{t('suggest.none')}</li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={`${s}-${i}`}
              id={`addr-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer px-3 py-3 text-sm ${i === active ? 'bg-blue-50' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass.**

Run: `npx vitest run tests/components/addressautocomplete.test.tsx && npx tsc --noEmit`
Expected: PASS (4/4).

- [ ] **Step 5: Commit.**

```bash
git add components/AddressAutocomplete.tsx tests/components/addressautocomplete.test.tsx
git commit -m "feat(ui): AddressAutocomplete combobox (debounced CAMS suggestions, keyboard, a11y)"
```

---

## Task 5: Wire autocomplete into the home page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the import.** Near the other component imports in `app/page.tsx`, add:

```tsx
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
```

- [ ] **Step 2: Replace the raw `<input>` in the form** with the autocomplete. Find the form block:

```tsx
      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); setAnswers({}); run(address, {}); }}>
        <input className="flex-1 rounded-lg border px-3 py-2" placeholder={t('page.placeholder')} value={address} onChange={(e) => setAddress(e.target.value)} />
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" disabled={loading}>{loading ? t('page.loading') : t('page.check')}</button>
      </form>
```

and replace the `<input ... />` line with:

```tsx
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={(full) => { setAddress(full); setAnswers({}); run(full, {}); }}
        />
```

(Leave the `<form>`, its `onSubmit`, and the `<button>` unchanged — free-text Enter/Check still works. `AddressAutocomplete` renders a `div.relative.flex-1`, so the flex row with the button is preserved.)

- [ ] **Step 3: Verify build + full suite.**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all green; build OK.

- [ ] **Step 4: Commit.**

```bash
git add app/page.tsx
git commit -m "feat(ui): use AddressAutocomplete on the home page"
```

---

## Task 6: Full verification + Chrome QA

**Files:** none (verification only)

- [ ] **Step 1:** `npx tsc --noEmit && npm test && npm run build` → all green.

- [ ] **Step 2: Chrome QA** (standing constraint). Start the prod server (`npm run start -- -p 3005`), and in Chrome:
  - Type "300 s santa fe" → a dropdown appears with multiple cities (Los Angeles, Long Beach, Huntington Park, …).
  - Pick "…, Los Angeles, CA" → the lookup runs and a result renders (no missing-city error).
  - Type a partial then use ArrowDown + Enter → selects and runs.
  - Type gibberish (≥4 chars) → "No matching address — try including the city".
  - Type 1–3 chars → no dropdown.
  - Free-text "1411 Murray Dr, Los Angeles" + Check (no selection) → still works.
  - Toggle Español → placeholder + "Buscando direcciones…" / no-results string localized.

- [ ] **Step 3: Stop the QA server** (`Stop-Process` the listener on 3005).

---

## Self-review notes
- Spec coverage: `fetchSuggestions`/`parseSuggestions`/`shouldSuggest` (T1), `/api/suggest` proxy with error→empty (T2), i18n loading/none (T3), `AddressAutocomplete` debounce/keyboard/a11y/stale-guard/empty/loading (T4), page wiring preserving free-text submit (T5), verification + Chrome QA EN/ES (T6). All spec sections mapped.
- Placeholder scan: none.
- Type consistency: route returns `{ suggestions: string[] }`; component reads `json.suggestions`; client `fetchSuggestions` returns `string[]`; `onSelect(full: string)` matches the page's `run(full, {})`. Consistent.
- Note: the `< 4` guard lives in both the client (`shouldSuggest`, so the route is safe) and the component (so it doesn't even fire a request) — intentional belt-and-suspenders, not duplication of logic that can drift (both reference the same intent; the component's literal `4` mirrors `SUGGEST_MIN`).
