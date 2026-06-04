# RentRights M4-D — Accessibility & mobile pass

Date: 2026-06-03
Status: Design (approved direction; pending spec review)

## Context & problem

The persona review flagged accessibility gaps for an audience that skews older,
low-vision, ESL, and mobile: a low-contrast staleness line, small tap targets,
no visible keyboard focus, and no screen-reader announcement of results/errors.
This sub-project is a focused a11y/mobile pass. (`tel:` links already exist on
every GetHelp phone — no change needed there.)

## Goal

Meet WCAG AA contrast on text, give interactive elements visible keyboard focus
and ≥44px touch targets, and announce results/errors/loading to screen readers.

Non-goals: layout changes (M4-C done) and accuracy/jargon copy (M4-E).

## Findings (current state, audited)

- **Contrast:** `text-gray-400` on white ≈ 2.8:1 — fails AA. Only one spot:
  ResultCard staleness line. Other small text uses `text-gray-500` (≈4.8:1 —
  passes AA) and the banner `text-amber-800` on `bg-amber-50` (≈8:1 — passes).
- **Focus:** no `focus-visible` styles anywhere; keyboard users get only the
  browser default (often invisible against the dark/edge styles).
- **Tap targets:** the EN/ES language toggle buttons (`px-2 py-1`) and the Share
  "Copy link" button (`px-2 py-1 text-xs`) are ~32px tall (<44px). GetHelp
  Website/phone links are thin inline text. ConfirmingQuestions buttons are
  already `py-3` (≈44px, from M4-A).
- **Screen reader:** the result block and the error `<p>` have no live-region
  semantics; the loading state only changes the (disabled) button label.
- **`tel:`:** GetHelp phones are already `tel:` links. (Banner/WhatToDoNow
  phones live inside sentences; left as text — the tappable copy is in GetHelp.)

## Changes

### 1. Contrast (`components/ResultCard.tsx`)
- Staleness line: `text-gray-400` → `text-gray-600` (≈7:1). No other contrast
  changes (the rest already pass AA).

### 2. Global keyboard focus (`app/globals.css`)
- Add one rule so every interactive element shows a visible ring on keyboard
  focus (DRY — no per-component churn):

```css
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
summary:focus-visible,
[role="option"]:focus-visible {
  outline: 2px solid #2563eb;   /* blue-600 */
  outline-offset: 2px;
  border-radius: 4px;
}
```

### 3. Tap targets ≥44px
- `app/page.tsx` language toggle buttons: `px-2 py-1` → `min-h-11 px-3` (with
  `inline-flex items-center`), keeping the active/inactive styles.
- `components/ShareButton.tsx` copy button: `px-2 py-1 text-xs` →
  `min-h-11 px-3 text-sm`.
- `components/GetHelp.tsx` Website/phone links: make each an
  `inline-flex min-h-11 items-center` (padding to reach 44px touch height),
  keeping `text-blue-600 underline`.

(`min-h-11` = 2.75rem = 44px in this Tailwind config.)

### 4. Screen-reader announcements (`app/page.tsx`)
- Error `<p>` (the red box): add `role="alert"` so failures are announced
  immediately.
- Result wrapper `<div className="mt-6">`: add `aria-live="polite"` so a result
  (or the questions flow) is announced when it appears.
- Loading: add a visually-hidden status line near the form —
  `{loading && <p role="status" className="sr-only">{t('page.loading')}</p>}` —
  so "Looking up public records…" is announced (the disabled button label is
  not reliably announced). Add a `.sr-only` utility to `app/globals.css` if
  Tailwind's `sr-only` is not already available (it is, via `@import
  "tailwindcss"` — so just use the `sr-only` class).

### 5. `tel:` links
- No change — already implemented in GetHelp. Documented here for completeness.

## Testing

Most of this pass is CSS/markup that unit tests assert weakly. Keep automated
tests light and honest; verify the rest in Chrome via the accessibility tree.

- **GetHelp** (`tests/components/gethelp.test.tsx`): assert every rendered phone
  is a `tel:` link (`href` starts with `tel:`) and the Website link is present —
  a regression lock on the already-correct behavior. (If this test already
  exists, extend it; otherwise add it.)
- **Manual / Chrome QA** (standing constraint): use `read_page` (accessibility
  tree) to confirm the error has `role=alert`, the result region is a live
  region, and the loading status is announced; tab through the page to confirm a
  visible focus ring on the input, autocomplete options, toggle/Check/Copy
  buttons, and links; spot-check contrast on the staleness line; confirm the
  toggle/Copy buttons and help links are ≥44px. Check EN and ES.
- Offline `npm test` + `npx tsc --noEmit` + `npm run build` stay green (no
  regressions; these are additive class/attribute changes).

## Out of scope
Accuracy/jargon copy (M4-E); the get-help org data still awaits the legal
sign-off track.
