# RentRights M4-C — Result readability, reassurance & loading

Date: 2026-06-03
Status: Design (approved direction; pending spec review)

## Context & problem

The persona review found the result screen leads with technical records, buries
the increase-checker (the thing renters most want — "is my increase legal?"),
offers no reassurance or next steps, and double-hedges ("→ Likely: … (likely)").
The loading state is a bare "…".

## Goal

Reorder and reframe the result so a scared, non-expert renter sees, in order:
a plain reassuring verdict → the increase check → what it means → what to do
now → help → (collapsible) the records behind it. Plus: a real loading message,
de-duplicated "likely", and an empowerment-framed confirmation banner.

Non-goals (separate sub-projects): site-wide accessibility/contrast/`tel:`
(M4-D), broader accuracy copy like mailed-notice +5 days and jargon rewrites in
the rights bullets (M4-E). This sub-project does reframe the one confirmation
banner and dedup the title, which are readability, not new legal content.

## New result order (`app/page.tsx` result block)

For a covered regime (RSO / AB1482 / JCO_ONLY / COUNTY_RSTPO / COUNTY_JCO):

1. **ResultCard** (slimmed) — reassurance line + regime title (no "(likely)"
   dup) + confidence + the cap figure + the rights bullets + reframed banner.
2. **IncreaseChecker** — moved directly under the verdict (renters' top task),
   with a more inviting heading.
3. **WhatToDoNow** — 2–3 concrete next steps (new).
4. **ConfirmingQuestions** (only when `result.questions` is non-empty).
5. **dataWarnings**.
6. **GetHelp**.
7. **RecordsDetails** — the "what public records show" reasons, moved OUT of
   ResultCard into a collapsible `<details>` near the bottom (new).
8. **ShareButton** + **Disclaimer** (unchanged position at the end).

For UNKNOWN ("need more info") the order is: ResultCard (its UNKNOWN title +
point) → ConfirmingQuestions → … → RecordsDetails. For OUT_OF_JURISDICTION:
ResultCard (OOJ title/point) → GetHelp → RecordsDetails → Disclaimer (no
reassurance, no WhatToDoNow, no IncreaseChecker — those are gated below).

## Components

### ResultCard (slimmed) — `components/ResultCard.tsx`
- **Remove** the "WHAT PUBLIC RECORDS SHOW" label + the reasons `<ul>` (those
  move to `RecordsDetails`).
- **Add** a reassurance line above the title for covered regimes only:
  `result.reassure` ("You have rights — here's what we found for your
  address."). Not shown for `UNKNOWN` or `OUT_OF_JURISDICTION`.
- Keep: title, confidence badge, "Legal annual increase" + `capLabel` +
  staleness, rights bullets, the banner (now via reframed copy).
- A small helper `isCovered(regime)` (RSO/AB1482/JCO_ONLY/COUNTY_RSTPO/
  COUNTY_JCO) decides the reassurance line; reuse for gating in `page.tsx`.

### RecordsDetails (new) — `components/RecordsDetails.tsx`
- Renders a native `<details>` with a `<summary>` (`result.detailsToggle` —
  "See the records behind this estimate") and the reasons list
  (`result.reasons.map(r => t('reason.'+code, params))`). Closed by default.
- Props: `{ reasons: ReasonItem[] }`.

### WhatToDoNow (new) — `components/WhatToDoNow.tsx`
- Renders a titled block (`whatToDo.heading` — "What you can do now") with three
  steps: `whatToDo.step1` ("Save or screenshot this page."),
  `whatToDo.step2` ("Confirm your rights for free — call {agency}: {phone}."),
  `whatToDo.step3` ("Get free legal help below."). The agency/phone come from
  the regime-aware authority already used by the banner (`cityAuthority` /
  `countyAuthority` in `lib/content/help.ts`; County regimes → DCBA, else
  LAHD). Props: `{ regime: Regime }`.
- Shown only for covered regimes (gated in `page.tsx` via `isCovered`).

### IncreaseChecker — `components/IncreaseChecker.tsx`
- Copy-only change: `increase.heading` → "Is your rent increase legal?" (ES:
  "¿Es legal el aumento de su renta?"). No logic change; it already renders only
  for cap-bearing regimes and shows a no-cap note otherwise. Position handled in
  `page.tsx`.

### Banner reframe — `lib/content/rights.ts` (`notFinalBanner`) + catalogs
- Keep the regime-aware agency/phone logic. Reframe the copy from a warning to
  empowerment:
  - `result.notFinal` (EN): "This is a free estimate. Confirm your rights for
    free with {agency}: {phone}."
  - `result.notFinalGeneric` (EN): "This is a free estimate. Confirm your rights
    with your local rent/housing authority."
  - ES mirrors. (Phone/agency params unchanged, so `notFinalBanner` code is
    untouched.)

### "likely" de-duplication — catalogs only
- Drop the "(likely)" / "(probable)" suffix from `rights.RSO.title`,
  `rights.AB1482.title`, `rights.COUNTY_RSTPO.title` in EN + ES. The
  `result.likelyPrefix` ("→ Likely:" / "→ Probablemente:") already conveys the
  hedge once.

### Loading message — catalogs only
- `page.loading`: "…" → "Looking up public records…" (ES: "Buscando registros
  públicos…"). It already shows on the disabled Check button while a lookup runs.

## i18n (EN + ES)

New: `result.reassure`, `result.detailsToggle`, `whatToDo.heading`,
`whatToDo.step1`, `whatToDo.step2` (uses `{agency} {phone}`), `whatToDo.step3`.
Changed: `page.loading`, `increase.heading`, `result.notFinal`,
`result.notFinalGeneric`, `rights.RSO.title`, `rights.AB1482.title`,
`rights.COUNTY_RSTPO.title`. Catalog parity test keeps EN/ES in sync.

## Data flow

No data/engine changes. Pure presentation reorder + copy. `page.tsx` reads the
same `data.result` / `data.dataWarnings` and arranges the components in the new
order. Only the **reassurance line and WhatToDoNow** are gated by
`isCovered(regime)`. IncreaseChecker is simply moved to the new position and
keeps its existing internal self-gating (form for cap-bearing regimes, a no-cap
note for JCO_ONLY/COUNTY_JCO, null for OOJ/UNKNOWN) — so it can be rendered
unconditionally in its new slot. RecordsDetails renders whenever there are
reasons.

## Testing

- **ResultCard** (`tests/components/resultcard.test.tsx`): renders the
  reassurance line for RSO and the title WITHOUT "(likely)"; does NOT render the
  reasons list (moved out); banner reframed text still contains the regime
  phone; no reassurance for OUT_OF_JURISDICTION.
- **RecordsDetails** (`tests/components/recordsdetails.test.tsx`): renders the
  summary toggle and each reason; is a `<details>` (closed by default).
- **WhatToDoNow** (`tests/components/whattodonow.test.tsx`): renders the three
  steps; step 2 shows LAHD (866) 557-7368 for RSO and LA County DCBA
  (800) 593-8222 for COUNTY_RSTPO.
- **i18n**: parity stays green; reason-code coverage unaffected.
- Update existing tests that asserted reasons inside ResultCard or matched the
  old "Not final" banner text.
- Offline `npm test` + `npx tsc --noEmit` + `npm run build` green; full-site
  Chrome QA (EN/ES) of the new order, the moved increase-checker, the
  collapsible records, the loading message, and the reframed banner.

## Out of scope
Accessibility/contrast/`tel:` (M4-D); jargon rewrites in rights/reason bullets
and accuracy items like mailed-notice +5 days (M4-E). The get-help org data
still awaits the legal sign-off track before launch.
