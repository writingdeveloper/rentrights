# RentRights 2026 redesign — design (approved)

- **Date:** 2026-06-04
- **Status:** Approved direction (multi-agent design review + user pick), pending implementation plan
- **Direction:** **A "Quiet Document" + two borrowed B moves** (status-hero verdict + one reduced-motion-guarded result reveal) — chosen for a calm, trustworthy, accessible civic tool serving stressed, bilingual, mostly-mobile renters.
- **Area:** `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, the 11 `components/*.tsx`.
- **Origin:** Workflow `rentrights-remaining-and-design` (7 expert agents) + web research on 2026 design trends.

## Goals & non-negotiables

- A calm, modern, trustworthy look (GOV.UK / Vercel-docs restraint), **typography-led**, that works **light AND dark** from a single semantic token system.
- **WCAG AA** everywhere (the current dark mode fails: components use light-mode-fixed `text-gray-*`; verify each pair ≥4.5:1 text / ≥3:1 UI in Chrome, both schemes).
- **Preserve all behavior, i18n (EN/ES), ARIA, and the engine/result logic.** This is a visual/structural reskin — no copy changes beyond layout grouping, no logic changes.
- Mobile-first, single column, ≥48px touch targets.
- No heavy new deps (Tailwind v4 `@theme` + `next/font/google` only).

## Known bug to fix first

`app/globals.css:25` sets `font-family: Arial, Helvetica, sans-serif` on `body`, which **overrides the loaded `next/font`** — the app currently renders Arial, not the loaded font. Removing this override is a prerequisite for the typography work.

## 1. Semantic token system (`globals.css`)

Replace the two-variable setup with a full semantic token layer in `:root` (light) + a `@media (prefers-color-scheme: dark)` block, exposed to Tailwind via `@theme inline` so classes like `bg-surface`, `text-muted-foreground`, `border-border` exist. Every fg/bg pair is an AA target to **verify in Chrome QA** before merge.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FBFCFD` | `#0C111A` | page base (never pure black) |
| `--surface` | `#FFFFFF` | `#141B26` | cards, inputs, dropdown |
| `--surface-muted` | `#F2F5F8` | `#1C2533` | FAQ rows, subtle fills |
| `--foreground` | `#0E1726` | `#E8EDF3` | primary text |
| `--muted-foreground` | `#52617A` | `#9DAABD` | secondary text (fixes the gray-on-black AA fail) |
| `--border` | `#DBE2EA` | `#283142` | hairlines |
| `--border-strong` | `#AEBBCB` | `#3C485C` | hover/focus borders (≥3:1) |
| `--primary` | `#1A5FBF` | `#6BA6F2` | links, primary button, focus ring |
| `--primary-soft` | `#E7F0FB` | `#16243B` | info/selected surfaces |
| `--success` / `--success-soft` | `#1F7A4D` / `#E3F3EA` | `#56C98A` / `#10241A` | "protected" verdict |
| `--warning` / `--warning-soft` | `#A65B00` / `#FBEFDD` | `#E5A85A` / `#241B10` | "it depends / take action" (amber, **not** red) |
| `--danger` | `#B42318` | `#F0857A` | reserved for rare destructive emphasis |

Rules:
- Default `border-color` → `--border` globally (so `border` utilities adapt).
- Dark-mode **primary buttons**: text = `--background` (dark) on the light-blue `--primary` fill (≥7:1) — never white text on light-blue in dark mode.
- `:focus-visible` outline driven by `--primary` (lightens in dark; replaces the fixed `#2563eb`).
- Honor `prefers-contrast: more` / `forced-colors` via a token-override block (no new components).

## 2. Typography

- **Fraunces** (variable serif) for the wordmark, H1/H2, and the verdict headline — warmth + authority.
- **Inter** (variable sans) for body/UI — legibility + full Spanish-diacritic coverage. `tabular-nums` for legal figures (caps, dates).
- Both via `next/font/google` (self-hosted, no layout shift), wired to `--font-sans`/`--font-serif`. **Delete the Arial override.** Geist may be removed or kept as mono; default body font = Inter.
- Mobile-first `clamp()` scale; **body ≥17px (`1.0625rem`) at 1.65 line-height**; `text-wrap: balance` on headings, `pretty` on paragraphs.

## 3. Spacing & layout

- 4px base; vertical rhythm in 8s (`space-y-6` in-card, `gap-4` between fields, `py-16`–`py-24` between sections).
- App flow container `max-w-2xl` (≈48rem), single column always; footer/marketing may use wider later.
- Touch targets **≥48×48** (`min-h-12`), full-width buttons on mobile.

## 4. Component direction (the "Quiet Document" reskin + status hero)

- **Color sweep:** across `page.tsx` + the 11 components, replace hardcoded `gray/green/amber/red/blue` + `bg-white` with the semantic tokens (P0 invisible/low-contrast text → P1 surfaces like inputs/cards/dropdown → P2/3 borders/accents). Pure class swaps; no `t()`/DOM/ARIA changes.
- **Result restructure** (`page.tsx` result block) into three calm bands with clear hierarchy: **Your answer** (verdict + cap + rights) → **What to do** (increase checker + WhatToDoNow) → **Get help** (GetHelp) → collapsible records + share + disclaimer.
- **Status-hero verdict** (borrowed B move, in `ResultCard`): a focal hero = status **icon** + serif verdict headline + the cap as a large `tabular-nums` focal stat, on a tinted token surface (`--success-soft` / `--warning-soft` / `--primary-soft`). Verdict status is conveyed by **icon + text**, never hue alone (WCAG 1.4.1), and keeps the existing `role="status"` announcement.
- **One result reveal** (borrowed B move): a subtle fade/slide-in on the result block, wrapped in `@media (prefers-reduced-motion: reduce)` to disable. No other motion.
- Inputs/dropdown/cards/FAQ use `--surface`/`--surface-muted` + `--border`; flat surfaces, hairlines, **no gradients/glass**.

## 5. Out of scope

- Copy/wording changes (handled by the legal sign-off track); engine/logic; new routes; aurora/glass (rejected for this audience); Docker (Vercel zero-config). SEO polish + rate-limit ship as separate PRs.

## 6. Testing & QA

- No new unit tests (visual/structural); existing 182 tests, `tsc`, `lint`, `build` stay green. (If any component had a test, keep it green.)
- **Chrome QA (mandatory, both color schemes × EN/ES):** full flow — landing → address lookup → result (status hero) → confirming questions → get-help → FAQ. Confirm: readable contrast in **dark and light** (spot-check key pairs ≥4.5:1 text / ≥3:1 UI), the font is now Fraunces/Inter (not Arial), status hero shows icon+text (not color-only), the reduced-motion guard works, touch targets ≥48px, nothing regressed functionally.
- Toggle OS/browser color scheme to verify both; verify the EN/ES toggle still works and translates.

## Verification gate

`tsc` 0 · `lint` 0 · `test` 182 green · `build` 0 · CI green on the PR · Chrome QA passes in light+dark × EN/ES with no contrast or functional regressions.
