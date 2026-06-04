# M4-D Accessibility & Mobile Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the UI to WCAG AA contrast, give interactive elements visible keyboard focus and ≥44px touch targets, and announce results/errors/loading to screen readers.

**Architecture:** Mostly additive CSS/markup: one global `:focus-visible` rule, a contrast fix, `min-h-11` tap targets, and ARIA live-region/alert attributes. No logic changes.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (`@import "tailwindcss"` — `sr-only` and `min-h-11` are available), Vitest (jsdom).

Spec: `docs/superpowers/specs/2026-06-03-rentrights-accessibility-design.md`. All changes are additive class/attribute edits — the full suite stays green at every commit.

---

## Task 1: Global keyboard focus ring

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append a `:focus-visible` rule to `app/globals.css`** (after the existing `body { … }` block):

```css
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
summary:focus-visible,
[role="option"]:focus-visible {
  outline: 2px solid #2563eb; /* blue-600 */
  outline-offset: 2px;
  border-radius: 4px;
}
```

- [ ] **Step 2: Verify build (CSS compiles) + suite green.**

Run: `npm run build && npm test`
Expected: build OK; 152 tests still pass.

- [ ] **Step 3: Commit.**

```bash
git add app/globals.css
git commit -m "a11y(M4-D): global focus-visible ring for keyboard users"
```

---

## Task 2: Contrast fix + ≥44px tap targets

**Files:**
- Modify: `components/ResultCard.tsx`
- Modify: `app/page.tsx`
- Modify: `components/ShareButton.tsx`
- Modify: `components/GetHelp.tsx`
- Test: `tests/components/gethelp.test.tsx`

- [ ] **Step 1: Add a `tel:`-link regression test.** In `tests/components/gethelp.test.tsx`, add inside the `describe('GetHelp', …)` block:

```tsx
  it('renders each phone as a tel: link', () => {
    render(
      <LocaleProvider initialLocale="en">
        <GetHelp />
      </LocaleProvider>,
    );
    const telLinks = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('tel:'));
    expect(telLinks.length).toBeGreaterThan(0);
    telLinks.forEach((a) => expect(a.getAttribute('href')).toMatch(/^tel:\+?[0-9]+$/));
  });
```

- [ ] **Step 2: Run it** — `npx vitest run tests/components/gethelp.test.tsx` — expect PASS (the behavior already exists; this just locks it).

- [ ] **Step 3: Fix the contrast failure in `components/ResultCard.tsx`.** Change the staleness line's class from `text-gray-400` to `text-gray-600`:

```tsx
            return s?.stale ? <p className="mt-1 text-xs text-gray-600">⚠ {stalenessMessage(s, t, result.regime)}</p> : null;
```

- [ ] **Step 4: Enlarge the language toggle buttons in `app/page.tsx`.** Both toggle buttons currently use `rounded px-2 py-1 …`. Change each `className` template's static part from `rounded px-2 py-1` to `rounded px-3 min-h-11 inline-flex items-center`, keeping the conditional active/inactive part. Result:

```tsx
            className={`rounded px-3 min-h-11 inline-flex items-center ${locale === 'en' ? 'bg-blue-600 text-white' : 'border'}`}
```
```tsx
            className={`rounded px-3 min-h-11 inline-flex items-center ${locale === 'es' ? 'bg-blue-600 text-white' : 'border'}`}
```

- [ ] **Step 5: Enlarge the Share buttons in `components/ShareButton.tsx`.** Change the copy button (currently `rounded-lg border px-3 py-1 text-sm font-semibold`) to:

```tsx
      <button type="button" onClick={onShare} className="rounded-lg border px-3 min-h-11 inline-flex items-center text-sm font-semibold">
```

and the fallback input (currently `mt-2 w-full rounded border px-2 py-1 text-xs text-gray-600`) to give it a comfortable height:

```tsx
          className="mt-2 w-full rounded border px-3 min-h-11 text-sm text-gray-600"
```

- [ ] **Step 6: Enlarge the GetHelp links in `components/GetHelp.tsx`.** Both the Website `<a>` and the phone `<a>` use `className="text-blue-600 underline"`. Change BOTH to:

```tsx
className="inline-flex min-h-11 items-center text-blue-600 underline"
```

(The Website link keeps `target`/`rel`; the phone link keeps its `tel:` href.)

- [ ] **Step 7: Verify.**

Run: `npx vitest run tests/components/gethelp.test.tsx tests/components/resultcard.test.tsx && npx tsc --noEmit && npm test`
Expected: all green (these are class-only changes; no assertion depends on the old classes).

- [ ] **Step 8: Commit.**

```bash
git add components/ResultCard.tsx app/page.tsx components/ShareButton.tsx components/GetHelp.tsx tests/components/gethelp.test.tsx
git commit -m "a11y(M4-D): AA contrast for staleness + ≥44px tap targets; lock tel: links"
```

---

## Task 3: Screen-reader announcements

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Mark the error box as an alert.** The error paragraph currently is:

```tsx
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error === '__NETWORK__' ? t('page.networkError') : t(`error.${error}`)}
        </p>
      )}
```

Add `role="alert"` to the `<p>`:

```tsx
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error === '__NETWORK__' ? t('page.networkError') : t(`error.${error}`)}
        </p>
      )}
```

- [ ] **Step 2: Add a visually-hidden loading status.** Immediately AFTER the closing `</form>` tag in `app/page.tsx`, add:

```tsx
      {loading && <p role="status" className="sr-only">{t('page.loading')}</p>}
```

- [ ] **Step 3: Make the result region a polite live region.** The result wrapper is `{data && (<div className="mt-6">`. Add `aria-live="polite"`:

```tsx
      {data && (
        <div className="mt-6" aria-live="polite">
```

(Leave the children unchanged.)

- [ ] **Step 4: Verify.**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc clean; all tests pass; build OK.

- [ ] **Step 5: Commit.**

```bash
git add app/page.tsx
git commit -m "a11y(M4-D): role=alert on errors, aria-live result region, sr-only loading status"
```

---

## Task 4: Verification + Chrome accessibility QA

**Files:** none.

- [ ] **Step 1:** `npx tsc --noEmit && npm test && npm run build` → all green.

- [ ] **Step 2: Chrome a11y QA** (standing constraint). `npm run start -- -p 3005`, then in Chrome:
  - **Keyboard:** Tab through the page — confirm a visible blue focus ring on the address input, each autocomplete option, the EN/ES toggle, the Check button, the increase-checker inputs, the "Copy link" button, and the GetHelp Website/phone links.
  - **Accessibility tree** (`read_page`): confirm the error box exposes `role=alert` (trigger it by submitting a city-less address), the result region is a live region, and the loading status is announced.
  - **Tap targets:** confirm the EN/ES toggle, "Copy link", and GetHelp links render ≥44px tall (inspect or eyeball on a narrow viewport).
  - **Contrast:** confirm the staleness line (when shown) is now legible (gray-600).
  - Check both EN and ES.

- [ ] **Step 3: Stop the QA server** (Stop-Process the 3005 listener).

---

## Self-review notes
- Spec coverage: global focus ring (T1); contrast gray-400→gray-600 + ≥44px tap targets on lang toggle / share / help links + tel: regression lock (T2); error role=alert + result aria-live + sr-only loading status (T3); verification + Chrome a11y QA EN/ES (T4). `tel:` links already existed (locked by the T2 test). All spec sections mapped.
- Placeholder scan: none.
- Consistency: `min-h-11` (44px) used uniformly for tap targets; the focus rule is global so individual components need no per-element focus classes. All edits are additive class/attribute changes — no test asserts the old classes, so the suite stays green throughout.
