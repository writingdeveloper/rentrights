# M4-A Confirming-Question Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four "missing records" confirming questions understandable to a layperson, add an "I'm not sure" option that resolves to the most protective interpretation, and show honestly when an answer was assumed.

**Architecture:** Plain-language copy in the i18n catalogs; a new `UserAnswers.unsure: QuestionId[]` carried through the engine, the share codec, and the question component. The engine reads the `unsure` list at each decision and emits `ASSUMED_*` reasons; "I'm not sure" sets no boolean. Stay green at every commit (copy → types → engine → share → component).

**Tech Stack:** Next.js 16 / React 19 / TypeScript, Vitest (node + jsdom), custom flat-key i18n (`messages/*.json`).

Spec: `docs/superpowers/specs/2026-06-03-rentrights-question-clarity-design.md`.

---

## Task 1: Rewrite question copy + add new strings (EN & ES)

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`

- [ ] **Step 1: Replace the four questions' copy and add help/shared/assumed keys in `messages/en.json`.**

Replace the existing `question.BUILT_BEFORE_OCT_1978.*` / `IS_SEPARATE_HOUSE.*` / `AB1482_EXEMPTION_NOTICE.*` / `IS_CONDO.*` lines (keep `question.heading` as-is) with:

```json
  "question.BUILT_BEFORE_OCT_1978.q": "Is your building older — finished before October 1978?",
  "question.BUILT_BEFORE_OCT_1978.help": "Older buildings usually get LA's strongest rent protections (RSO). Not sure of the exact year? That's normal — pick \"I'm not sure\" and we'll stay on the protective side.",
  "question.BUILT_BEFORE_OCT_1978.yes": "Yes — before Oct 1978",
  "question.BUILT_BEFORE_OCT_1978.no": "No — newer than that",
  "question.IS_SEPARATE_HOUSE.q": "Is your home part of a building with other units — or a single stand-alone house?",
  "question.IS_SEPARATE_HOUSE.help": "Apartment buildings and duplexes are \"a building with other units.\" A back house, casita, or ADU counts as a single house. Not sure? Pick the first one.",
  "question.IS_SEPARATE_HOUSE.no": "A building with other units",
  "question.IS_SEPARATE_HOUSE.yes": "A single stand-alone house",
  "question.AB1482_EXEMPTION_NOTICE.q": "Did your landlord give you a written notice saying your home is NOT covered by California's rent-cap law?",
  "question.AB1482_EXEMPTION_NOTICE.help": "A specific signed paper (it may say \"exempt\" or mention \"AB 1482\"), usually given when you sign your lease. Most renters never got one. Don't remember? Pick No.",
  "question.AB1482_EXEMPTION_NOTICE.no": "No / I never got one",
  "question.AB1482_EXEMPTION_NOTICE.yes": "Yes — I got that notice",
  "question.IS_CONDO.q": "Is your home a rental apartment, or a condo someone owns?",
  "question.IS_CONDO.help": "A condo is a unit someone bought (you'd rent from that individual person). A rental apartment is part of a building run by one landlord or company. Most renters: rental apartment. Not sure? Pick rental apartment.",
  "question.IS_CONDO.no": "Rental apartment",
  "question.IS_CONDO.yes": "A condo someone owns",
  "question.common": "most common",
  "question.unsure": "I'm not sure",
```

Then add these four reason strings (next to the other `reason.*` keys):

```json
  "reason.ASSUMED_BUILD_UNKNOWN": "You weren't sure of the build date, so we left it open and stayed on the protective side.",
  "reason.ASSUMED_MULTIUNIT": "You weren't sure, so we assumed a building with other units (keeps more protections).",
  "reason.ASSUMED_NOT_CONDO": "You weren't sure, so we assumed a regular rental apartment (keeps the rent cap in play).",
  "reason.ASSUMED_NO_EXEMPTION": "You weren't sure about an exemption notice, so we assumed none — confirm with LAHD.",
```

- [ ] **Step 2: Mirror all the same keys in `messages/es.json`** (plain Spanish, not literal):

```json
  "question.BUILT_BEFORE_OCT_1978.q": "¿Su edificio es más antiguo — terminado antes de octubre de 1978?",
  "question.BUILT_BEFORE_OCT_1978.help": "Los edificios antiguos suelen tener las protecciones de renta más fuertes de LA (RSO). ¿No sabe el año exacto? Es normal — elija \"No estoy seguro/a\" y nos quedamos del lado protector.",
  "question.BUILT_BEFORE_OCT_1978.yes": "Sí — antes de oct. 1978",
  "question.BUILT_BEFORE_OCT_1978.no": "No — más nuevo que eso",
  "question.IS_SEPARATE_HOUSE.q": "¿Su vivienda es parte de un edificio con otras unidades — o una casa independiente?",
  "question.IS_SEPARATE_HOUSE.help": "Los edificios de apartamentos y dúplex son \"un edificio con otras unidades\". Una casa de atrás, casita o ADU cuenta como casa independiente. ¿No está seguro/a? Elija la primera.",
  "question.IS_SEPARATE_HOUSE.no": "Un edificio con otras unidades",
  "question.IS_SEPARATE_HOUSE.yes": "Una casa independiente",
  "question.AB1482_EXEMPTION_NOTICE.q": "¿Su arrendador le dio un aviso por escrito diciendo que su vivienda NO está cubierta por la ley estatal de tope de renta?",
  "question.AB1482_EXEMPTION_NOTICE.help": "Es un papel firmado específico (puede decir \"exento\" o mencionar \"AB 1482\"), normalmente al firmar el contrato. La mayoría nunca recibió uno. ¿No lo recuerda? Elija No.",
  "question.AB1482_EXEMPTION_NOTICE.no": "No / nunca recibí uno",
  "question.AB1482_EXEMPTION_NOTICE.yes": "Sí — recibí ese aviso",
  "question.IS_CONDO.q": "¿Su vivienda es un apartamento de alquiler, o un condominio que alguien compró?",
  "question.IS_CONDO.help": "Un condominio es una unidad que alguien compró (usted le alquila a esa persona). Un apartamento de alquiler es parte de un edificio administrado por un dueño o empresa. La mayoría: apartamento de alquiler. ¿No está seguro/a? Elija apartamento de alquiler.",
  "question.IS_CONDO.no": "Apartamento de alquiler",
  "question.IS_CONDO.yes": "Un condominio que alguien compró",
  "question.common": "lo más común",
  "question.unsure": "No estoy seguro/a",
```

and the reason strings:

```json
  "reason.ASSUMED_BUILD_UNKNOWN": "No estaba seguro/a de la fecha de construcción, así que la dejamos abierta y nos quedamos del lado protector.",
  "reason.ASSUMED_MULTIUNIT": "No estaba seguro/a, así que asumimos un edificio con otras unidades (mantiene más protecciones).",
  "reason.ASSUMED_NOT_CONDO": "No estaba seguro/a, así que asumimos un apartamento de alquiler normal (mantiene el tope de renta vigente).",
  "reason.ASSUMED_NO_EXEMPTION": "No estaba seguro/a sobre un aviso de exención, así que asumimos que no hay — confirme con LAHD.",
```

- [ ] **Step 3: Verify catalog parity test passes.**

Run: `npx vitest run tests/i18n/catalog.test.ts`
Expected: PASS (EN and ES have identical key sets).

- [ ] **Step 4: Commit.**

```bash
git add messages/en.json messages/es.json
git commit -m "i18n(M4-A): plain-language question copy, help/unsure/common, ASSUMED_* reasons"
```

---

## Task 2: Types — `unsure` field + four reason codes

**Files:**
- Modify: `lib/rules/types.ts`

- [ ] **Step 1: Add `unsure` to `UserAnswers`.** Replace the `UserAnswers` interface with:

```ts
export interface UserAnswers {
  builtBeforeOct1978?: boolean;
  isSeparateHouse?: boolean; // true => the 2nd unit is an ADU/guest house (treat as single-family)
  hasAb1482ExemptionNotice?: boolean;
  isCondo?: boolean; // true => individually-owned condo (treat like single-family for rent-cap rules)
  unsure?: QuestionId[]; // questions the user answered "I'm not sure" (sets no boolean)
}
```

- [ ] **Step 2: Add the four reason codes to the `ReasonCode` union.** After `'SAID_NOT_SEPARATE_HOUSE'` add:

```ts
  | 'ASSUMED_BUILD_UNKNOWN'
  | 'ASSUMED_MULTIUNIT'
  | 'ASSUMED_NOT_CONDO'
  | 'ASSUMED_NO_EXEMPTION'
```

- [ ] **Step 3: Add them to `ALL_REASON_CODES`.** Add this line inside the array (e.g. right after the `'SAID_NOT_SEPARATE_HOUSE', 'UNITS_COUNT',` line group):

```ts
  'ASSUMED_BUILD_UNKNOWN', 'ASSUMED_MULTIUNIT', 'ASSUMED_NOT_CONDO', 'ASSUMED_NO_EXEMPTION',
```

- [ ] **Step 4: Type-check + reason-coverage test.**

Run: `npx tsc --noEmit && npx vitest run tests/i18n/coverage.test.ts`
Expected: PASS (each code in `ALL_REASON_CODES` now has a catalog entry from Task 1).

- [ ] **Step 5: Commit.**

```bash
git add lib/rules/types.ts
git commit -m "types(M4-A): UserAnswers.unsure + ASSUMED_* reason codes"
```

---

## Task 3: Engine — interpret `unsure` as protective defaults

**Files:**
- Modify: `lib/rules/engine.ts`
- Test: `tests/rules/engine.test.ts`

- [ ] **Step 1: Write failing engine tests.** Append to `tests/rules/engine.test.ts` (inside the existing `describe('resolveRegime', …)` block, before its closing `});`):

```ts
  it('all questions unsure (LA city, no facts) → RSO medium, assumed reasons, no re-ask', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: null, units: null, useCode: null },
      answers: { unsure: ['BUILT_BEFORE_OCT_1978', 'IS_SEPARATE_HOUSE', 'IS_CONDO', 'AB1482_EXEMPTION_NOTICE'] },
    });
    expect(r.regime).toBe('RSO');
    expect(r.confidence).toBe('medium');
    expect(r.questions).toEqual([]);
    const codes = r.reasons.map((x) => x.code);
    expect(codes).toContain('ASSUMED_BUILD_UNKNOWN');
    expect(codes).toContain('ASSUMED_MULTIUNIT');
    expect(codes).toContain('ASSUMED_NOT_CONDO');
  });

  it('single-family + exemption unsure → AB1482 medium (assumed no notice)', () => {
    const r = resolveRegime({
      jurisdiction: LA,
      facts: { yearBuilt: 2000, units: 1, useCode: '0100' },
      answers: { unsure: ['AB1482_EXEMPTION_NOTICE'] },
    });
    expect(r.regime).toBe('AB1482');
    expect(r.questions).toEqual([]);
    expect(r.reasons.map((x) => x.code)).toContain('ASSUMED_NO_EXEMPTION');
  });

  it('County: form + condo unsure (no facts) → COUNTY_RSTPO medium', () => {
    const r = resolveRegime({
      jurisdiction: { inLACity: false, placeName: null, incorporated: false, inLACounty: true },
      facts: { yearBuilt: null, units: null, useCode: null },
      answers: { unsure: ['IS_SEPARATE_HOUSE', 'IS_CONDO'] },
    });
    expect(r.regime).toBe('COUNTY_RSTPO');
    expect(r.confidence).toBe('medium');
    expect(r.questions).toEqual([]);
    expect(r.reasons.map((x) => x.code)).toContain('ASSUMED_MULTIUNIT');
  });
```

- [ ] **Step 2: Run to verify they fail.**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: FAIL (regime UNKNOWN / questions not empty — unsure not handled yet).

- [ ] **Step 3: Implement `unsure` handling in `resolveRegime` (City path).**

(a) After `const questions: QuestionId[] = [];` add:

```ts
  const unsure = answers.unsure ?? [];
```

(b) In the build-era block, insert an unsure branch between the explicit-answer branch and the `facts.yearBuilt == null` branch:

```ts
  let builtBefore: boolean | null;
  if (answers.builtBeforeOct1978 !== undefined) {
    builtBefore = answers.builtBeforeOct1978;
    reasons.push({ code: builtBefore ? 'SAID_BUILT_BEFORE_1978' : 'SAID_BUILT_AFTER_1978' });
  } else if (unsure.includes('BUILT_BEFORE_OCT_1978')) {
    builtBefore = null;
    reasons.push({ code: 'ASSUMED_BUILD_UNKNOWN' });
  } else if (facts.yearBuilt == null) {
    builtBefore = null;
    questions.push('BUILT_BEFORE_OCT_1978');
  } else if (facts.yearBuilt < LEGAL.rsoBuildCutoffYear) {
```

(c) In the unit-count block, insert an unsure branch between the `isSeparateHouse === false` branch and the `facts.units == null` branch:

```ts
  } else if (answers.isSeparateHouse === false) {
    multiUnit = true;
    reasons.push({ code: 'SAID_NOT_SEPARATE_HOUSE' });
  } else if (unsure.includes('IS_SEPARATE_HOUSE')) {
    multiUnit = true;
    reasons.push({ code: 'ASSUMED_MULTIUNIT' });
  } else if (facts.units == null) {
    multiUnit = null;
    questions.push('IS_SEPARATE_HOUSE');
  } else if (facts.units >= 3) {
```

(d) Replace the condo follow-up block with:

```ts
  if (multiUnit === true && answers.isCondo === undefined && useCodeKind(facts.useCode) !== 'apartment') {
    if (unsure.includes('IS_CONDO')) reasons.push({ code: 'ASSUMED_NOT_CONDO' });
    else questions.push('IS_CONDO');
  }
```

(e) Replace the single-family decision (`if (multiUnit === false) { … }`) with:

```ts
  if (multiUnit === false) {
    // Single-family / condo: AB1482 unless landlord gave an exemption notice; citywide JCO just-cause always applies.
    if (answers.hasAb1482ExemptionNotice === undefined && !unsure.includes('AB1482_EXEMPTION_NOTICE')) {
      questions.push('AB1482_EXEMPTION_NOTICE');
      reasons.push({ code: 'SFR_MAYBE_EXEMPT' });
      return { regime: 'JCO_ONLY', confidence: 'low', reasons, questions };
    }
    if (unsure.includes('AB1482_EXEMPTION_NOTICE')) {
      reasons.push({ code: 'ASSUMED_NO_EXEMPTION' });
      reasons.push({ code: 'NO_EXEMPTION_NOTICE' });
      return { regime: 'AB1482', confidence: 'medium', reasons, questions };
    }
    if (answers.hasAb1482ExemptionNotice) {
      reasons.push({ code: 'EXEMPTION_NOTICE_GIVEN' });
      return { regime: 'JCO_ONLY', confidence: 'medium', reasons, questions };
    }
    reasons.push({ code: 'NO_EXEMPTION_NOTICE' });
    return { regime: 'AB1482', confidence: 'medium', reasons, questions };
  }
```

- [ ] **Step 4: Implement `unsure` handling in `resolveCounty` (County path).**

(a) After its `const questions: QuestionId[] = [];` add `const unsure = answers.unsure ?? [];`.

(b) In its unit-count block, insert the unsure branch (same position as city):

```ts
  } else if (answers.isSeparateHouse === false) {
    multiUnit = true;
    reasons.push({ code: 'SAID_NOT_SEPARATE_HOUSE' });
  } else if (unsure.includes('IS_SEPARATE_HOUSE')) {
    multiUnit = true;
    reasons.push({ code: 'ASSUMED_MULTIUNIT' });
  } else if (facts.units == null) {
    multiUnit = null;
    questions.push('IS_SEPARATE_HOUSE');
  } else if (facts.units >= 3) {
```

(c) Replace its condo follow-up block with:

```ts
  if (multiUnit === true && answers.isCondo === undefined && useCodeKind(facts.useCode) !== 'apartment') {
    if (unsure.includes('IS_CONDO')) reasons.push({ code: 'ASSUMED_NOT_CONDO' });
    else questions.push('IS_CONDO');
  }
```

(County age stays as-is — the County path does not ask the build-era question; `COUNTY_BUILT_UNKNOWN` already covers unknown year.)

- [ ] **Step 5: Run tests to verify they pass.**

Run: `npx vitest run tests/rules/engine.test.ts && npx tsc --noEmit`
Expected: PASS (all engine tests, including the new ones).

- [ ] **Step 6: Commit.**

```bash
git add lib/rules/engine.ts tests/rules/engine.test.ts
git commit -m "feat(engine): interpret UserAnswers.unsure as protective defaults (City + County)"
```

---

## Task 4: Share codec — round-trip `unsure`

**Files:**
- Modify: `lib/share/code.ts`
- Test: `tests/share/code.test.ts`

- [ ] **Step 1: Write a failing round-trip test.** Append inside the existing describe block in `tests/share/code.test.ts` (before its closing `});`):

```ts
  it('round-trips the unsure list', () => {
    const encoded = encodeShare({ address: '1 Main St, Los Angeles', answers: { unsure: ['BUILT_BEFORE_OCT_1978', 'IS_CONDO'] } });
    const decoded = decodeShare('#' + encoded);
    expect(decoded?.answers.unsure).toEqual(['BUILT_BEFORE_OCT_1978', 'IS_CONDO']);
  });
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run tests/share/code.test.ts`
Expected: FAIL (`unsure` is undefined after decode).

- [ ] **Step 3: Implement encode/decode of `unsure`.** In `lib/share/code.ts`:

(a) Below `ANSWER_KEYS`, add a `QuestionId`↔param-letter map:

```ts
import { QuestionId, UserAnswers } from '@/lib/rules/types';
// ... existing imports ...

// Compact mapping of "unsure" QuestionIds to single letters (param "u", e.g. u=bc).
const UNSURE_CODES: { code: string; id: QuestionId }[] = [
  { code: 'b', id: 'BUILT_BEFORE_OCT_1978' },
  { code: 's', id: 'IS_SEPARATE_HOUSE' },
  { code: 'e', id: 'AB1482_EXEMPTION_NOTICE' },
  { code: 'c', id: 'IS_CONDO' },
];
```

(Adjust the existing `import { UserAnswers } from '@/lib/rules/types';` line to also import `QuestionId` as shown.)

(b) In `encodeShare`, after the `ANSWER_KEYS` loop and before `return`:

```ts
  if (s.answers.unsure && s.answers.unsure.length > 0) {
    const letters = UNSURE_CODES.filter(({ id }) => s.answers.unsure!.includes(id)).map(({ code }) => code);
    if (letters.length > 0) params.set('u', letters.join(''));
  }
```

(c) In `decodeShare`, after the `ANSWER_KEYS` loop:

```ts
  const u = params.get('u');
  if (u) {
    const ids = UNSURE_CODES.filter(({ code }) => u.includes(code)).map(({ id }) => id);
    if (ids.length > 0) answers.unsure = ids;
  }
```

- [ ] **Step 4: Run to verify it passes.**

Run: `npx vitest run tests/share/code.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/share/code.ts tests/share/code.test.ts
git commit -m "feat(share): round-trip the unsure list in the share link"
```

---

## Task 5: Component — redesign `ConfirmingQuestions`

**Files:**
- Modify: `components/ConfirmingQuestions.tsx`
- Test: `tests/components/confirmingquestions.test.tsx`

- [ ] **Step 1: Replace the component test** `tests/components/confirmingquestions.test.tsx` with:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ConfirmingQuestions } from '@/components/ConfirmingQuestions';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { UserAnswers } from '@/lib/rules/types';

afterEach(cleanup);

function renderQs(onAnswer: (a: UserAnswers) => void, answers: UserAnswers = {}) {
  render(
    <LocaleProvider initialLocale="en">
      <ConfirmingQuestions questions={['IS_CONDO']} answers={answers} onAnswer={onAnswer} />
    </LocaleProvider>,
  );
}

describe('ConfirmingQuestions', () => {
  it('renders the rewritten condo question, helper, and three options', () => {
    renderQs(vi.fn());
    expect(screen.getByText(/rental apartment, or a condo someone owns/)).toBeTruthy();
    expect(screen.getByText(/A condo is a unit someone bought/)).toBeTruthy(); // helper
    expect(screen.getByRole('button', { name: /Rental apartment/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /A condo someone owns/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /I'm not sure/ })).toBeTruthy();
  });

  it('primary option (rental apartment) reports isCondo:false', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer);
    fireEvent.click(screen.getByRole('button', { name: /Rental apartment/ }));
    expect(onAnswer).toHaveBeenCalledWith({ isCondo: false });
  });

  it('"I\'m not sure" adds the question to unsure and sets no boolean', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer);
    fireEvent.click(screen.getByRole('button', { name: /I'm not sure/ }));
    expect(onAnswer).toHaveBeenCalledWith({ unsure: ['IS_CONDO'] });
  });

  it('choosing an explicit answer clears a prior unsure entry for that question', () => {
    const onAnswer = vi.fn();
    renderQs(onAnswer, { unsure: ['IS_CONDO'] });
    fireEvent.click(screen.getByRole('button', { name: /A condo someone owns/ }));
    expect(onAnswer).toHaveBeenCalledWith({ isCondo: true });
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run tests/components/confirmingquestions.test.tsx`
Expected: FAIL (old component renders "Yes, a condo" etc.).

- [ ] **Step 3: Replace `components/ConfirmingQuestions.tsx` with:**

```tsx
'use client';
import { QuestionId, UserAnswers } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';

type Opt = { labelKey: string; key: keyof UserAnswers; value: boolean; common?: boolean };

// For each question: the primary (safe / most-common) option is shown first and
// emphasized; the secondary is the other explicit answer. "I'm not sure" is
// handled separately and sets no boolean.
const QUESTION_META: Record<QuestionId, { primary: Opt; secondary: Opt }> = {
  BUILT_BEFORE_OCT_1978: {
    primary: { labelKey: 'question.BUILT_BEFORE_OCT_1978.yes', key: 'builtBeforeOct1978', value: true },
    secondary: { labelKey: 'question.BUILT_BEFORE_OCT_1978.no', key: 'builtBeforeOct1978', value: false },
  },
  IS_SEPARATE_HOUSE: {
    primary: { labelKey: 'question.IS_SEPARATE_HOUSE.no', key: 'isSeparateHouse', value: false, common: true },
    secondary: { labelKey: 'question.IS_SEPARATE_HOUSE.yes', key: 'isSeparateHouse', value: true },
  },
  IS_CONDO: {
    primary: { labelKey: 'question.IS_CONDO.no', key: 'isCondo', value: false, common: true },
    secondary: { labelKey: 'question.IS_CONDO.yes', key: 'isCondo', value: true },
  },
  AB1482_EXEMPTION_NOTICE: {
    primary: { labelKey: 'question.AB1482_EXEMPTION_NOTICE.no', key: 'hasAb1482ExemptionNotice', value: false, common: true },
    secondary: { labelKey: 'question.AB1482_EXEMPTION_NOTICE.yes', key: 'hasAb1482ExemptionNotice', value: true },
  },
};

function withAnswer(answers: UserAnswers, id: QuestionId, opt: Opt): UserAnswers {
  const next: UserAnswers = { ...answers, [opt.key]: opt.value };
  if (next.unsure) {
    const rest = next.unsure.filter((q) => q !== id);
    if (rest.length > 0) next.unsure = rest;
    else delete next.unsure;
  }
  return next;
}

function withUnsure(answers: UserAnswers, id: QuestionId, key: keyof UserAnswers): UserAnswers {
  const next: UserAnswers = { ...answers };
  delete next[key];
  const set = new Set(next.unsure ?? []);
  set.add(id);
  next.unsure = [...set];
  return next;
}

export function ConfirmingQuestions({ questions, answers, onAnswer }: {
  questions: QuestionId[];
  answers: UserAnswers;
  onAnswer: (next: UserAnswers) => void;
}) {
  const t = useT();
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm font-semibold">{t('question.heading')}</p>
      {questions.map((id) => {
        const m = QUESTION_META[id];
        const renderBtn = (opt: Opt) => (
          <button
            key={opt.labelKey}
            type="button"
            onClick={() => onAnswer(withAnswer(answers, id, opt))}
            className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${
              opt.common ? 'border-green-700 bg-green-50 font-semibold text-green-800' : 'border-gray-300'
            }`}
          >
            {t(opt.labelKey)}
            {opt.common && <span className="ml-1 text-xs font-normal text-green-700">· {t('question.common')}</span>}
          </button>
        );
        return (
          <div key={id} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm font-medium">{t(`question.${id}.q`)}</p>
            <p className="mt-1 text-xs text-gray-500">{t(`question.${id}.help`)}</p>
            <div className="mt-2 flex flex-col gap-2">
              {renderBtn(m.primary)}
              {renderBtn(m.secondary)}
              <button
                type="button"
                onClick={() => onAnswer(withUnsure(answers, id, m.primary.key))}
                className="w-full rounded-lg border border-dashed border-gray-400 px-3 py-3 text-left text-sm text-gray-500"
              >
                {t('question.unsure')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes.**

Run: `npx vitest run tests/components/confirmingquestions.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add components/ConfirmingQuestions.tsx tests/components/confirmingquestions.test.tsx
git commit -m "feat(ui): redesign ConfirmingQuestions — plain copy, helper, safe-first, I'm-not-sure"
```

---

## Task 6: Full verification + Chrome QA

**Files:** none (verification only)

- [ ] **Step 1: Full offline suite + type-check + build.**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all green, build OK.

- [ ] **Step 2: Chrome QA (standing constraint — verify from the user's perspective).**

Start the prod server (`npm run start -- -p 3005`) and, in Chrome:
- Enter an address that hits the questions (e.g. `300 S Santa Fe Ave, Los Angeles`).
- Confirm each question shows: plain wording, a helper line, the safe answer first with a "· most common" tag (Q2/Q3/Q4), and an "I'm not sure" button.
- Click "I'm not sure" through all questions → a result renders (no infinite re-ask) and the reasons include an "You weren't sure, so we assumed…" line.
- Toggle Español and confirm the questions/helpers are translated.

- [ ] **Step 3: Stop the QA server** (`Stop-Process` the listener on 3005).

---

## Self-review notes
- Spec coverage: plain copy (T1), unsure data model (T2), engine protective defaults + ASSUMED reasons City & County (T3), share round-trip (T4), component safe-first + helper + unsure (T5), QA incl. Chrome (T6). All spec sections mapped.
- Deviation from spec: "I'm not sure" uses a single shared `question.unsure` key (not per-ID) — simpler, same text everywhere. Noted here intentionally.
- Type consistency: `unsure?: QuestionId[]` used identically in types, engine (`answers.unsure ?? []`), share, and component; reason codes match between Task 2 and the `reasons.push` calls in Task 3 and the catalog strings in Task 1.
