# M4-E Accuracy Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Single-source the rent-increase notice from `LEGAL.notice` (showing the mailed +5 days), pair the SFR exemption reason with its Just Cause protection, and replace "parcel" with "property".

**Architecture:** `rightsText()` passes `LEGAL.notice` figures as params so the three notice bullets render from the constant; the rest is catalog copy edits (EN + ES). No new i18n keys, no logic change.

**Tech Stack:** Next.js 16, React, custom flat-key i18n (`translate()` substitutes `{placeholders}`), Vitest.

Spec: `docs/superpowers/specs/2026-06-03-rentrights-accuracy-copy-design.md`. No test asserts the old notice/reason text, so the suite stays green at each commit.

---

## Task 1: Notice bullet from `LEGAL.notice`

**Files:**
- Modify: `lib/content/rights.ts`
- Modify: `messages/en.json`, `messages/es.json`
- Test: `tests/content/rights.test.ts`

- [ ] **Step 1: Write the failing test.** In `tests/content/rights.test.ts`, add `import { LEGAL } from '@/lib/legal/constants';` to the imports, then append:

```ts
describe('notice bullet', () => {
  it('is built from LEGAL.notice, including the mailed +5 days', () => {
    const pts = rightsText('RSO', t).points;
    const notice = pts.find((p) => p.toLowerCase().includes('notice')) ?? '';
    expect(notice).toContain(String(LEGAL.notice.smallIncreaseDays)); // 30
    expect(notice).toContain(String(LEGAL.notice.largeIncreaseDays)); // 90
    expect(notice).toContain(String(LEGAL.notice.mailExtraDays)); // 5
    expect(notice.toLowerCase()).toContain('mail');
  });
});
```

- [ ] **Step 2: Run it** — `npx vitest run tests/content/rights.test.ts` — expect FAIL (current notice string has no "5"/"mail").

- [ ] **Step 3: Parameterize the notice strings.** In `messages/en.json`, set all three to:

```json
  "rights.RSO.point4": "Rent-increase notice: {small} days ({threshold}% or less) or {large} days (more than {threshold}%) — add {mail} days if it came by mail.",
```
```json
  "rights.AB1482.point4": "Rent-increase notice: {small} days ({threshold}% or less) or {large} days (more than {threshold}%) — add {mail} days if it came by mail.",
```
```json
  "rights.JCO_ONLY.point2": "Rent-increase notice: {small} days ({threshold}% or less) or {large} days (more than {threshold}%) — add {mail} days if it came by mail.",
```

In `messages/es.json`, set the same three to:

```json
  "rights.RSO.point4": "Aviso de aumento de renta: {small} días ({threshold}% o menos) o {large} días (más del {threshold}%) — añada {mail} días si llegó por correo.",
```
```json
  "rights.AB1482.point4": "Aviso de aumento de renta: {small} días ({threshold}% o menos) o {large} días (más del {threshold}%) — añada {mail} días si llegó por correo.",
```
```json
  "rights.JCO_ONLY.point2": "Aviso de aumento de renta: {small} días ({threshold}% o menos) o {large} días (más del {threshold}%) — añada {mail} días si llegó por correo.",
```

- [ ] **Step 4: Pass the notice params in `rightsText`.** In `lib/content/rights.ts`, replace the `rightsText` function body with (LEGAL is already imported):

```ts
export function rightsText(regime: Regime, t: T): { title: string; points: string[] } {
  const n = RIGHTS_POINTS[regime];
  const noticeParams = {
    small: LEGAL.notice.smallIncreaseDays,
    large: LEGAL.notice.largeIncreaseDays,
    threshold: LEGAL.notice.largeThresholdPct,
    mail: LEGAL.notice.mailExtraDays,
  };
  const points: string[] = [];
  for (let i = 1; i <= n; i++) points.push(t(`rights.${regime}.point${i}`, noticeParams));
  return { title: t(`rights.${regime}.title`), points };
}
```

- [ ] **Step 5: Run** — `npx vitest run tests/content/rights.test.ts tests/i18n/catalog.test.ts && npx tsc --noEmit` — expect PASS (notice test + parity green).

- [ ] **Step 6: Commit.**

```bash
git add lib/content/rights.ts messages/en.json messages/es.json tests/content/rights.test.ts
git commit -m "feat(copy): build the rent-increase notice from LEGAL.notice (show mailed +5 days)"
```

---

## Task 2: Exemption pairing + "parcel" → "property"

**Files:**
- Modify: `messages/en.json`, `messages/es.json`
- Test: `tests/content/rights.test.ts`

- [ ] **Step 1: Write the failing test.** Append to `tests/content/rights.test.ts`:

```ts
describe('reason copy', () => {
  it('pairs the SFR exemption with Just Cause and drops "parcel"', () => {
    expect(t('reason.SFR_MAYBE_EXEMPT').toLowerCase()).toContain('still apply');
    expect(t('reason.UNITS_COUNT', { count: 6 })).toBe('6 homes on the property');
    expect(t('reason.SINGLE_UNIT').toLowerCase()).not.toContain('parcel');
  });
});
```

- [ ] **Step 2: Run it** — `npx vitest run tests/content/rights.test.ts` — expect FAIL.

- [ ] **Step 3: Update `messages/en.json`:**

```json
  "reason.UNITS_COUNT": "{count} homes on the property",
```
```json
  "reason.TWO_UNITS": "2 homes on the property",
```
```json
  "reason.SINGLE_UNIT": "Only one home on the property (a single-family house)",
```
```json
  "reason.SFR_MAYBE_EXEMPT": "A single-family home or condo may be exempt from the AB 1482 rent cap (if the landlord gave the required notice) — but citywide Just Cause eviction protections still apply.",
```

- [ ] **Step 4: Update `messages/es.json`:**

```json
  "reason.UNITS_COUNT": "{count} viviendas en la propiedad",
```
```json
  "reason.TWO_UNITS": "2 viviendas en la propiedad",
```
```json
  "reason.SINGLE_UNIT": "Solo una vivienda en la propiedad (casa unifamiliar)",
```
```json
  "reason.SFR_MAYBE_EXEMPT": "Una vivienda unifamiliar o condominio podría estar exenta del tope de renta de la AB 1482 (si el arrendador dio el aviso requerido) — pero las protecciones contra el desalojo por causa justa de la ciudad siguen aplicando.",
```

- [ ] **Step 5: Run** — `npx vitest run tests/content/rights.test.ts tests/i18n/catalog.test.ts && npx tsc --noEmit && npm test` — expect all green.

- [ ] **Step 6: Commit.**

```bash
git add messages/en.json messages/es.json tests/content/rights.test.ts
git commit -m "feat(copy): pair SFR exemption with Just Cause; 'parcel' -> 'property'"
```

---

## Task 3: Verification + Chrome QA

**Files:** none.

- [ ] **Step 1:** `npx tsc --noEmit && npm test && npm run build` → all green.

- [ ] **Step 2: Chrome QA** (standing constraint). `npm run start -- -p 3005`, then in Chrome:
  - Look up an RSO address (e.g. `846 S Broadway, Los Angeles`). In the result, the notice bullet reads "Rent-increase notice: 30 days (10% or less) or 90 days (more than 10%) — add 5 days if it came by mail."
  - Expand "See the records behind this estimate" → unit-count reason reads "… homes on the property" (no "parcel").
  - For a single-family / exemption-question result, the SFR reason ends with "… Just Cause eviction protections still apply."
  - Toggle Español → notice "… añada 5 días si llegó por correo.", reasons in Spanish.

- [ ] **Step 3: Stop the QA server** (Stop-Process the 3005 listener).

---

## Self-review notes
- Spec coverage: notice from LEGAL incl. mailed +5 (T1); SFR exemption pairing + parcel→property (T2); verification + Chrome QA EN/ES (T3). All spec sections mapped.
- Placeholder scan: none.
- Consistency: `noticeParams` keys (`small`/`large`/`threshold`/`mail`) exactly match the `{placeholders}` in the three notice strings; `LEGAL.notice` field names (`smallIncreaseDays`/`largeIncreaseDays`/`largeThresholdPct`/`mailExtraDays`) are the real constant fields. No new i18n keys → parity preserved. No test or component asserts the old notice/reason text (resultcard no longer renders reasons; recordsdetails asserts IN_LA_CITY/BUILT_BEFORE_CUTOFF only).
