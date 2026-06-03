# RentRights M2-B — EN/ES i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the entire RentRights user experience into English and Spanish — static UI, engine evidence "reasons", data warnings, API errors, and the get-help directory — with a header toggle, cookie persistence, and Accept-Language auto-detection.

**Architecture:** A tiny custom message catalog (`messages/en.json` + `messages/es.json`) with a pure `translate()`, a client `LocaleProvider`/`useT()` (default locale `'en'` so components render before the provider is mounted), and a pure `pickInitialLocale()`. The rules engine and `/api/lookup` become **locale-agnostic** — they emit reason/warning/error **codes** (+params); the client renders them with `useT()`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind, Vitest. Zero new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-06-02-rentrights-m2b-i18n-design.md`

**Conventions:** Import alias `@/*` = repo root. Tests under `tests/`. Pure functions injected-date/dict for testability. Catalog keys are flat dotted strings. Commit after every green step. Branch: `m2b-i18n` (already created). After each task run `npx tsc --noEmit` AND `npm test` — every commit must type-check and pass (Vitest transpiles without full type-checking, so `tsc` is the build gate).

**Ordering rationale:** `useT()` returns English when no `LocaleProvider` is mounted, so Tasks 1–6 keep the tree green even though the provider isn't wired into `layout` until Task 7. The full catalog is authored in Task 2 so later tasks only wire `t(key)` calls (DRY — they never repeat string values).

---

## File Structure

- `lib/i18n/t.ts` — CREATE: pure `translate(messages, key, params?, fallback?)`
- `lib/i18n/detect.ts` — CREATE: pure `pickInitialLocale(cookieValue, acceptLanguage)`
- `lib/i18n/catalog.ts` — CREATE: `Locale` type + `CATALOG` from the JSON files
- `lib/i18n/LocaleProvider.tsx` — CREATE: context + `useLocale()` + `useT()` (EN default)
- `messages/en.json`, `messages/es.json` — CREATE: flat dotted-key catalogs
- `lib/rules/types.ts` — MODIFY: add `ReasonCode`, `ReasonItem`, `WarningCode`, `ErrorCode`; change `RegimeResult.reasons`
- `lib/rules/engine.ts` — MODIFY: push `ReasonItem`s instead of strings
- `lib/compute/lookup.ts` — MODIFY: `dataWarnings: WarningCode[]`
- `app/api/lookup/route.ts` — MODIFY: `{ error: ErrorCode }`
- `lib/content/rights.ts` — MODIFY: `rightsText(regime,t)`, `capLabel(regime,t,onDate?)`, `stalenessMessage(s,t,regime?)`
- `lib/content/help.ts` — MODIFY: `description` → `descriptionKey`
- `components/ResultCard.tsx`, `components/ConfirmingQuestions.tsx`, `components/Disclaimer.tsx`, `components/GetHelp.tsx` — MODIFY: `useT()`
- `app/page.tsx` — MODIFY: `useT()` + locale toggle
- `app/layout.tsx` — MODIFY: initial locale + `<html lang>` + localized metadata + `LocaleProvider`
- `tests/i18n/*` — CREATE: translate, detect, catalog completeness, code coverage
- Existing tests (`tests/rules/engine.test.ts`, `tests/compute/lookup.test.ts`, `tests/api/lookup.test.ts`, `tests/content/rights.test.ts`) — MODIFY to match new shapes

---

## Task 1: i18n primitives + provider + catalog completeness test

**Files:**
- Create: `lib/i18n/t.ts`, `lib/i18n/detect.ts`, `lib/i18n/catalog.ts`, `lib/i18n/LocaleProvider.tsx`, `messages/en.json`, `messages/es.json`
- Test: `tests/i18n/t.test.ts`, `tests/i18n/detect.test.ts`, `tests/i18n/catalog.test.ts`

- [ ] **Step 1: Write failing unit tests for `translate` and `pickInitialLocale`**

Create `tests/i18n/t.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { translate } from '@/lib/i18n/t';

const en = { 'a.b': 'Hello {name}', 'plain': 'Plain' };
const es = { 'a.b': 'Hola {name}' };

describe('translate', () => {
  it('looks up a key in the given messages', () => {
    expect(translate(en, 'plain')).toBe('Plain');
  });
  it('interpolates {params}', () => {
    expect(translate(es, 'a.b', { name: 'Ana' })).toBe('Hola Ana');
  });
  it('falls back to the fallback dict when the key is missing', () => {
    expect(translate(es, 'plain', undefined, en)).toBe('Plain');
  });
  it('returns the key itself when missing everywhere', () => {
    expect(translate(es, 'nope', undefined, en)).toBe('nope');
  });
  it('leaves unknown {tokens} untouched', () => {
    expect(translate(en, 'a.b')).toBe('Hello {name}');
  });
});
```

Create `tests/i18n/detect.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pickInitialLocale } from '@/lib/i18n/detect';

describe('pickInitialLocale', () => {
  it('honors a valid cookie first', () => {
    expect(pickInitialLocale('es', 'en-US,en')).toBe('es');
    expect(pickInitialLocale('en', 'es')).toBe('en');
  });
  it('ignores an invalid cookie and uses Accept-Language', () => {
    expect(pickInitialLocale('xx', 'es-MX,es;q=0.9')).toBe('es');
  });
  it('detects Spanish from Accept-Language when no cookie', () => {
    expect(pickInitialLocale(undefined, 'es-ES,es;q=0.9,en;q=0.8')).toBe('es');
  });
  it('defaults to English', () => {
    expect(pickInitialLocale(undefined, 'en-US,en')).toBe('en');
    expect(pickInitialLocale(undefined, null)).toBe('en');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/i18n/t.test.ts tests/i18n/detect.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the pure helpers**

Create `lib/i18n/t.ts`:
```ts
export function translate(
  messages: Record<string, string>,
  key: string,
  params?: Record<string, string | number>,
  fallback?: Record<string, string>,
): string {
  const template = messages[key] ?? fallback?.[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}
```

Create `lib/i18n/detect.ts`:
```ts
import { Locale } from './catalog';

export function pickInitialLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (cookieValue === 'en' || cookieValue === 'es') return cookieValue;
  if (acceptLanguage && /(^|[,\s])es\b/i.test(acceptLanguage)) return 'es';
  return 'en';
}
```

- [ ] **Step 4: Create the catalog loader + seed JSON files**

Create `messages/en.json`:
```json
{}
```
Create `messages/es.json`:
```json
{}
```
Create `lib/i18n/catalog.ts`:
```ts
import en from '@/messages/en.json';
import es from '@/messages/es.json';

export type Locale = 'en' | 'es';

export const CATALOG: Record<Locale, Record<string, string>> = {
  en: en as Record<string, string>,
  es: es as Record<string, string>,
};
```
> Note: importing `.json` requires `resolveJsonModule` — Next's `tsconfig.json` enables it by default (`"resolveJsonModule": true` is part of the Next preset). If `tsc` complains, add `"resolveJsonModule": true` under `compilerOptions` in `tsconfig.json`.

- [ ] **Step 5: Write the catalog completeness test**

Create `tests/i18n/catalog.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CATALOG } from '@/lib/i18n/catalog';

describe('catalog completeness', () => {
  it('en and es have identical key sets', () => {
    const enKeys = Object.keys(CATALOG.en).sort();
    const esKeys = Object.keys(CATALOG.es).sort();
    expect(esKeys).toEqual(enKeys);
  });
});
```

- [ ] **Step 6: Create the LocaleProvider (EN default so components work before it is mounted)**

Create `lib/i18n/LocaleProvider.tsx`:
```tsx
'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { CATALOG, Locale } from './catalog';
import { translate } from './t';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', setLocale: () => {} });

export function LocaleProvider({ initialLocale = 'en', children }: { initialLocale?: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `rr_locale=${l}; path=/; max-age=31536000`;
  }, []);
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const { locale } = useContext(LocaleContext);
  return (key: string, params?: Record<string, string | number>) => translate(CATALOG[locale], key, params, CATALOG.en);
}
```

- [ ] **Step 7: Run all i18n tests + tsc**

Run: `npx vitest run tests/i18n/` then `npx tsc --noEmit`
Expected: all pass (5 + 4 + 1 = 10 tests), tsc clean.

- [ ] **Step 8: Commit**
```powershell
git add lib/i18n messages tests/i18n
git commit -m "feat(i18n): translate/detect helpers, catalog loader, LocaleProvider"
```

---

## Task 2: Author the full EN/ES catalog + code-union types + coverage tests

**Files:**
- Modify: `messages/en.json`, `messages/es.json` (fill all keys)
- Modify: `lib/rules/types.ts` (add `ReasonCode`, `ReasonItem`, `WarningCode`, `ErrorCode` — type-only additions; `RegimeResult.reasons` stays `string[]` for now)
- Test: `tests/i18n/coverage.test.ts`

- [ ] **Step 1: Add the code-union types (no behavior change yet)**

In `lib/rules/types.ts`, append these (do NOT change `RegimeResult.reasons` yet — that flip is Task 3):
```ts
export type ReasonCode =
  | 'IN_LA_CITY'
  | 'SAID_BUILT_BEFORE_1978'
  | 'SAID_BUILT_AFTER_1978'
  | 'BUILT_BEFORE_CUTOFF'
  | 'BUILT_AFTER_CUTOFF'
  | 'BUILT_1978_AMBIGUOUS'
  | 'SAID_CONDO'
  | 'SAID_SEPARATE_HOUSE'
  | 'UNITS_COUNT'
  | 'TWO_UNITS'
  | 'SINGLE_UNIT'
  | 'NEW_CONSTRUCTION_EXEMPT'
  | 'NEAR_15YR_CUTOFF'
  | 'MULTIUNIT_AB1482'
  | 'MULTIUNIT_BUILDDATE_UNCERTAIN'
  | 'SFR_MAYBE_EXEMPT'
  | 'EXEMPTION_NOTICE_GIVEN'
  | 'NO_EXEMPTION_NOTICE'
  | 'OUT_OF_LA_CITY'
  | 'UNINCORPORATED_COUNTY';

export interface ReasonItem {
  code: ReasonCode;
  params?: Record<string, string | number>;
}

export type WarningCode = 'DATA_INCOMPLETE' | 'RECORDS_UNAVAILABLE';
export type ErrorCode = 'INVALID_BODY' | 'ADDRESS_REQUIRED' | 'ADDRESS_NOT_FOUND' | 'UPSTREAM_ERROR';

export const ALL_REASON_CODES: ReasonCode[] = [
  'IN_LA_CITY', 'SAID_BUILT_BEFORE_1978', 'SAID_BUILT_AFTER_1978', 'BUILT_BEFORE_CUTOFF',
  'BUILT_AFTER_CUTOFF', 'BUILT_1978_AMBIGUOUS', 'SAID_CONDO', 'SAID_SEPARATE_HOUSE', 'UNITS_COUNT',
  'TWO_UNITS', 'SINGLE_UNIT', 'NEW_CONSTRUCTION_EXEMPT', 'NEAR_15YR_CUTOFF', 'MULTIUNIT_AB1482',
  'MULTIUNIT_BUILDDATE_UNCERTAIN', 'SFR_MAYBE_EXEMPT', 'EXEMPTION_NOTICE_GIVEN', 'NO_EXEMPTION_NOTICE',
  'OUT_OF_LA_CITY', 'UNINCORPORATED_COUNTY',
];
export const ALL_WARNING_CODES: WarningCode[] = ['DATA_INCOMPLETE', 'RECORDS_UNAVAILABLE'];
export const ALL_ERROR_CODES: ErrorCode[] = ['INVALID_BODY', 'ADDRESS_REQUIRED', 'ADDRESS_NOT_FOUND', 'UPSTREAM_ERROR'];
```

- [ ] **Step 2: Fill `messages/en.json`**

Overwrite `messages/en.json` with the full English catalog:
```json
{
  "page.title": "RentRights",
  "page.tagline": "Know your renter rights in the City of LA — free, no sign-up, nothing stored.",
  "page.placeholder": "1234 S Main St, Los Angeles",
  "page.check": "Check",
  "page.loading": "…",
  "page.networkError": "Network error. Please try again.",
  "page.langEnglish": "English",
  "page.langSpanish": "Español",
  "result.whatRecordsShow": "What public records show",
  "result.likelyPrefix": "→ Likely:",
  "result.confidence.high": "High confidence",
  "result.confidence.medium": "Medium confidence",
  "result.confidence.low": "Low confidence",
  "result.legalIncrease": "Legal annual increase (current)",
  "result.notFinal": "⚠️ Not final — confirm with LAHD (866) 557-7368 →",
  "result.capUpTo": "up to {pct}%",
  "result.capRsoPending": "{floor}–{ceiling}% (LAHD publishes the exact figure)",
  "result.capSeeLahd": "See LAHD",
  "result.capSeeState": "See state guidance",
  "result.capNone": "No state/local rent cap — but Just Cause protections apply",
  "question.heading": "A couple of quick questions to improve accuracy:",
  "question.BUILT_BEFORE_OCT_1978.q": "Was this building built (certificate of occupancy) before October 1978?",
  "question.BUILT_BEFORE_OCT_1978.yes": "Yes, before Oct 1978",
  "question.BUILT_BEFORE_OCT_1978.no": "No / not sure it’s after",
  "question.IS_SEPARATE_HOUSE.q": "Is the other unit on the property a separate house (ADU/guest house) rather than an apartment?",
  "question.IS_SEPARATE_HOUSE.yes": "Yes, a separate house",
  "question.IS_SEPARATE_HOUSE.no": "No, it’s an apartment building",
  "question.AB1482_EXEMPTION_NOTICE.q": "Did your landlord give you a written \"AB 1482 exemption\" notice?",
  "question.AB1482_EXEMPTION_NOTICE.yes": "Yes",
  "question.AB1482_EXEMPTION_NOTICE.no": "No",
  "question.IS_CONDO.q": "Is this an individually-owned condominium (not a rental apartment)?",
  "question.IS_CONDO.yes": "Yes, a condo",
  "question.IS_CONDO.no": "No, a rental apartment",
  "rights.RSO.title": "Rent Stabilization Ordinance (likely)",
  "rights.RSO.point1": "Your landlord generally needs a \"just cause\" to evict you.",
  "rights.RSO.point2": "Rent may be increased only once every 12 months.",
  "rights.RSO.point3": "You may be owed relocation assistance for certain no-fault evictions.",
  "rights.RSO.point4": "Rent-increase notice: 30 days (≤10%) or 90 days (>10%).",
  "rights.AB1482.title": "California Tenant Protection Act (AB 1482) (likely)",
  "rights.AB1482.point1": "Statewide cap on annual rent increases.",
  "rights.AB1482.point2": "Just-cause eviction protections after 12 months of tenancy.",
  "rights.AB1482.point3": "One month of relocation assistance for no-fault evictions.",
  "rights.AB1482.point4": "Rent-increase notice: 30 days (≤10%) or 90 days (>10%).",
  "rights.JCO_ONLY.title": "LA Just Cause Ordinance (citywide)",
  "rights.JCO_ONLY.point1": "Even without a rent cap, your landlord generally needs a \"just cause\" to evict you (after 6 months).",
  "rights.JCO_ONLY.point2": "Rent-increase notice: 30 days (≤10%) or 90 days (>10%).",
  "rights.JCO_ONLY.point3": "Confirm whether AB 1482 also caps your rent — see below.",
  "rights.OUT_OF_JURISDICTION.title": "Outside the City of Los Angeles",
  "rights.OUT_OF_JURISDICTION.point1": "This tool currently covers the City of LA only. Your city or unincorporated LA County may have its own rules.",
  "rights.UNKNOWN.title": "We need a little more info",
  "rights.UNKNOWN.point1": "Answer the questions below so we can estimate your rights.",
  "staleness.whenSuffix": " around {date}",
  "staleness.pending": "This figure is pending publication{when}. Confirm the latest with {who}.",
  "staleness.pastUpdate": "This figure was due to update{when}. Confirm the latest with {who}.",
  "staleness.generic": "This figure may be out of date. Confirm the latest with {who}.",
  "staleness.authority.lahd": "LAHD",
  "staleness.authority.state": "the state (CA Civil Code §1947.12 / CPI)",
  "warning.DATA_INCOMPLETE": "We could not read full property records for this address, so we will ask you a couple of questions.",
  "warning.RECORDS_UNAVAILABLE": "Property records are temporarily unavailable; answers below are based only on your responses.",
  "error.INVALID_BODY": "We couldn’t read that request. Please try again.",
  "error.ADDRESS_REQUIRED": "An address is required.",
  "error.ADDRESS_NOT_FOUND": "We could not find that address. Try including the city, e.g. \"123 Main St, Los Angeles\".",
  "error.UPSTREAM_ERROR": "Something went wrong looking up that address. Please try again.",
  "reason.IN_LA_CITY": "In the City of Los Angeles",
  "reason.SAID_BUILT_BEFORE_1978": "You said it was built before Oct 1, 1978",
  "reason.SAID_BUILT_AFTER_1978": "You said it was built after Oct 1978",
  "reason.BUILT_BEFORE_CUTOFF": "Built in {year} (before the Oct 1, 1978 RSO cutoff)",
  "reason.BUILT_AFTER_CUTOFF": "Built in {year} (after the RSO cutoff)",
  "reason.BUILT_1978_AMBIGUOUS": "Built in 1978 — the exact certificate-of-occupancy date determines RSO coverage",
  "reason.SAID_CONDO": "You said this is an individually-owned condo (treated like a single-family home for rent-cap rules)",
  "reason.SAID_SEPARATE_HOUSE": "You said the other unit is a separate house (treated as single-family)",
  "reason.UNITS_COUNT": "{count} units on the parcel",
  "reason.TWO_UNITS": "2 units on the parcel",
  "reason.SINGLE_UNIT": "Single unit on the parcel (single-family)",
  "reason.NEW_CONSTRUCTION_EXEMPT": "Built in {year} — within the last 15 years, so likely exempt from AB 1482's rent cap (new construction). Citywide Just Cause still applies.",
  "reason.NEAR_15YR_CUTOFF": "This is near the 15-year cutoff — the exact certificate-of-occupancy date may affect this.",
  "reason.MULTIUNIT_AB1482": "Built after the RSO cutoff with multiple units → AB 1482 applies",
  "reason.MULTIUNIT_BUILDDATE_UNCERTAIN": "Multiple units, but the build date is uncertain → likely RSO pending confirmation",
  "reason.SFR_MAYBE_EXEMPT": "Single-family/condo may be exempt from AB 1482 rent caps (depends on a landlord notice)",
  "reason.EXEMPTION_NOTICE_GIVEN": "Landlord gave an AB 1482 exemption notice → no state rent cap, but citywide Just Cause still applies",
  "reason.NO_EXEMPTION_NOTICE": "No AB 1482 exemption notice → AB 1482 rent cap applies",
  "reason.OUT_OF_LA_CITY": "{placeName} is outside the City of Los Angeles",
  "reason.UNINCORPORATED_COUNTY": "This address may be in unincorporated LA County, which has its own rules (County RSTPO via DCBA) rather than the City of Los Angeles.",
  "help.title": "Get free help",
  "help.website": "Website",
  "help.LAHD.description": "The City of LA agency that administers the RSO. Confirm your rent-law status and file complaints.",
  "help.STAY_HOUSED.description": "City/County tenant-defense partnership offering free workshops, legal clinics, and eviction-defense representation for LA County renters.",
  "help.SAJE.description": "Grassroots tenant-organizing and economic-justice nonprofit in South LA — workshops, know-your-rights resources, and community campaigns.",
  "help.LAFLA.description": "Nonprofit law firm providing free legal representation to low-income tenants facing eviction and housing discrimination across Greater LA.",
  "help.DCBA.description": "County agency administering rent stabilization and tenant protections for unincorporated LA County — mediation and complaint intake.",
  "help.CES.description": "Grassroots tenant-organizing group since 1973; free Saturday Tenants' Rights Clinic via Zoom and wrongful-eviction support in LA.",
  "help.ICLC.description": "Poverty-law firm fighting homelessness and housing loss for low-income tenants, veterans, and people with disabilities in LA.",
  "help.NLSLA.description": "Free legal aid for eviction defense, rent control, and housing discrimination for low-income residents throughout LA County.",
  "disclaimer.text": "⚠️ This is an estimate based on public records, not a lookup from LAHD’s registry, and is not legal advice. Always confirm with LAHD before acting. Legal figures last verified {lastVerified}.",
  "meta.title": "RentRights — LA renter rights, by address",
  "meta.description": "Free, open-source tool that estimates your City of Los Angeles rent-law protections from your address. Not legal advice."
}
```

- [ ] **Step 3: Fill `messages/es.json` (Spanish — same key set)**

Overwrite `messages/es.json`:
```json
{
  "page.title": "RentRights",
  "page.tagline": "Conozca sus derechos como inquilino en la Ciudad de LA — gratis, sin registro, no se guarda nada.",
  "page.placeholder": "1234 S Main St, Los Angeles",
  "page.check": "Consultar",
  "page.loading": "…",
  "page.networkError": "Error de red. Inténtelo de nuevo.",
  "page.langEnglish": "English",
  "page.langSpanish": "Español",
  "result.whatRecordsShow": "Lo que muestran los registros públicos",
  "result.likelyPrefix": "→ Probablemente:",
  "result.confidence.high": "Confianza alta",
  "result.confidence.medium": "Confianza media",
  "result.confidence.low": "Confianza baja",
  "result.legalIncrease": "Aumento legal anual (actual)",
  "result.notFinal": "⚠️ No es definitivo — confirme con LAHD (866) 557-7368 →",
  "result.capUpTo": "hasta {pct}%",
  "result.capRsoPending": "{floor}–{ceiling}% (LAHD publica la cifra exacta)",
  "result.capSeeLahd": "Consulte LAHD",
  "result.capSeeState": "Consulte la guía estatal",
  "result.capNone": "Sin tope de renta estatal/local — pero aplican las protecciones de Causa Justa",
  "question.heading": "Unas preguntas rápidas para mejorar la precisión:",
  "question.BUILT_BEFORE_OCT_1978.q": "¿Este edificio se construyó (certificado de ocupación) antes de octubre de 1978?",
  "question.BUILT_BEFORE_OCT_1978.yes": "Sí, antes de oct. de 1978",
  "question.BUILT_BEFORE_OCT_1978.no": "No / no estoy seguro, es posterior",
  "question.IS_SEPARATE_HOUSE.q": "¿La otra unidad de la propiedad es una casa aparte (ADU/casa de huéspedes) y no un apartamento?",
  "question.IS_SEPARATE_HOUSE.yes": "Sí, una casa aparte",
  "question.IS_SEPARATE_HOUSE.no": "No, es un edificio de apartamentos",
  "question.AB1482_EXEMPTION_NOTICE.q": "¿Su arrendador le entregó un aviso escrito de \"exención de la AB 1482\"?",
  "question.AB1482_EXEMPTION_NOTICE.yes": "Sí",
  "question.AB1482_EXEMPTION_NOTICE.no": "No",
  "question.IS_CONDO.q": "¿Es un condominio de propiedad individual (no un apartamento de alquiler)?",
  "question.IS_CONDO.yes": "Sí, un condominio",
  "question.IS_CONDO.no": "No, un apartamento de alquiler",
  "rights.RSO.title": "Ordenanza de Estabilización de Rentas (probable)",
  "rights.RSO.point1": "Por lo general, su arrendador necesita una \"causa justa\" para desalojarlo.",
  "rights.RSO.point2": "La renta solo puede aumentarse una vez cada 12 meses.",
  "rights.RSO.point3": "Es posible que le corresponda asistencia de reubicación en ciertos desalojos sin culpa.",
  "rights.RSO.point4": "Aviso de aumento de renta: 30 días (≤10%) o 90 días (>10%).",
  "rights.AB1482.title": "Ley de Protección al Inquilino de California (AB 1482) (probable)",
  "rights.AB1482.point1": "Tope estatal a los aumentos anuales de renta.",
  "rights.AB1482.point2": "Protecciones de desalojo por causa justa tras 12 meses de arrendamiento.",
  "rights.AB1482.point3": "Un mes de asistencia de reubicación en desalojos sin culpa.",
  "rights.AB1482.point4": "Aviso de aumento de renta: 30 días (≤10%) o 90 días (>10%).",
  "rights.JCO_ONLY.title": "Ordenanza de Causa Justa de LA (en toda la ciudad)",
  "rights.JCO_ONLY.point1": "Aun sin tope de renta, por lo general su arrendador necesita una \"causa justa\" para desalojarlo (después de 6 meses).",
  "rights.JCO_ONLY.point2": "Aviso de aumento de renta: 30 días (≤10%) o 90 días (>10%).",
  "rights.JCO_ONLY.point3": "Confirme si la AB 1482 también limita su renta — vea abajo.",
  "rights.OUT_OF_JURISDICTION.title": "Fuera de la Ciudad de Los Ángeles",
  "rights.OUT_OF_JURISDICTION.point1": "Esta herramienta cubre solo la Ciudad de LA. Su ciudad o el área no incorporada del Condado de LA puede tener sus propias reglas.",
  "rights.UNKNOWN.title": "Necesitamos un poco más de información",
  "rights.UNKNOWN.point1": "Responda las preguntas de abajo para poder estimar sus derechos.",
  "staleness.whenSuffix": " alrededor del {date}",
  "staleness.pending": "Esta cifra está pendiente de publicación{when}. Confirme la más reciente con {who}.",
  "staleness.pastUpdate": "Esta cifra debía actualizarse{when}. Confirme la más reciente con {who}.",
  "staleness.generic": "Esta cifra podría estar desactualizada. Confirme la más reciente con {who}.",
  "staleness.authority.lahd": "LAHD",
  "staleness.authority.state": "el estado (Código Civil de CA §1947.12 / IPC)",
  "warning.DATA_INCOMPLETE": "No pudimos leer los registros completos de la propiedad para esta dirección, así que le haremos unas preguntas.",
  "warning.RECORDS_UNAVAILABLE": "Los registros de la propiedad no están disponibles por el momento; las respuestas de abajo se basan solo en lo que usted indicó.",
  "error.INVALID_BODY": "No pudimos leer esa solicitud. Inténtelo de nuevo.",
  "error.ADDRESS_REQUIRED": "Se requiere una dirección.",
  "error.ADDRESS_NOT_FOUND": "No pudimos encontrar esa dirección. Intente incluir la ciudad, p. ej. \"123 Main St, Los Angeles\".",
  "error.UPSTREAM_ERROR": "Algo salió mal al consultar esa dirección. Inténtelo de nuevo.",
  "reason.IN_LA_CITY": "En la Ciudad de Los Ángeles",
  "reason.SAID_BUILT_BEFORE_1978": "Usted indicó que se construyó antes del 1 de oct. de 1978",
  "reason.SAID_BUILT_AFTER_1978": "Usted indicó que se construyó después de oct. de 1978",
  "reason.BUILT_BEFORE_CUTOFF": "Construido en {year} (antes del límite del RSO del 1 de oct. de 1978)",
  "reason.BUILT_AFTER_CUTOFF": "Construido en {year} (después del límite del RSO)",
  "reason.BUILT_1978_AMBIGUOUS": "Construido en 1978 — la fecha exacta del certificado de ocupación determina la cobertura del RSO",
  "reason.SAID_CONDO": "Usted indicó que es un condominio de propiedad individual (tratado como vivienda unifamiliar para las reglas de tope de renta)",
  "reason.SAID_SEPARATE_HOUSE": "Usted indicó que la otra unidad es una casa aparte (tratada como unifamiliar)",
  "reason.UNITS_COUNT": "{count} unidades en la parcela",
  "reason.TWO_UNITS": "2 unidades en la parcela",
  "reason.SINGLE_UNIT": "Una sola unidad en la parcela (unifamiliar)",
  "reason.NEW_CONSTRUCTION_EXEMPT": "Construido en {year} — dentro de los últimos 15 años, por lo que probablemente está exento del tope de renta de la AB 1482 (construcción nueva). La Causa Justa de la ciudad sigue aplicando.",
  "reason.NEAR_15YR_CUTOFF": "Está cerca del límite de 15 años — la fecha exacta del certificado de ocupación podría afectar esto.",
  "reason.MULTIUNIT_AB1482": "Construido después del límite del RSO con varias unidades → aplica la AB 1482",
  "reason.MULTIUNIT_BUILDDATE_UNCERTAIN": "Varias unidades, pero la fecha de construcción es incierta → probablemente RSO, pendiente de confirmación",
  "reason.SFR_MAYBE_EXEMPT": "Una vivienda unifamiliar/condominio podría estar exenta del tope de renta de la AB 1482 (depende de un aviso del arrendador)",
  "reason.EXEMPTION_NOTICE_GIVEN": "El arrendador entregó un aviso de exención de la AB 1482 → sin tope estatal de renta, pero la Causa Justa de la ciudad sigue aplicando",
  "reason.NO_EXEMPTION_NOTICE": "Sin aviso de exención de la AB 1482 → aplica el tope de renta de la AB 1482",
  "reason.OUT_OF_LA_CITY": "{placeName} está fuera de la Ciudad de Los Ángeles",
  "reason.UNINCORPORATED_COUNTY": "Esta dirección podría estar en el área no incorporada del Condado de LA, que tiene sus propias reglas (RSTPO del Condado vía DCBA) en lugar de las de la Ciudad de Los Ángeles.",
  "help.title": "Obtenga ayuda gratuita",
  "help.website": "Sitio web",
  "help.LAHD.description": "La agencia de la Ciudad de LA que administra el RSO. Confirme su situación legal de renta y presente quejas.",
  "help.STAY_HOUSED.description": "Alianza de defensa de inquilinos de la Ciudad/Condado que ofrece talleres gratuitos, clínicas legales y representación en defensa contra desalojos para inquilinos del Condado de LA.",
  "help.SAJE.description": "Organización comunitaria de inquilinos y justicia económica en el sur de LA — talleres, recursos para conocer sus derechos y campañas comunitarias.",
  "help.LAFLA.description": "Bufete sin fines de lucro que brinda representación legal gratuita a inquilinos de bajos ingresos que enfrentan desalojo y discriminación de vivienda en el área de LA.",
  "help.DCBA.description": "Agencia del Condado que administra la estabilización de rentas y las protecciones de inquilinos en el área no incorporada del Condado de LA — mediación y recepción de quejas.",
  "help.CES.description": "Grupo comunitario de inquilinos desde 1973; Clínica de Derechos del Inquilino gratuita los sábados por Zoom y apoyo ante desalojos indebidos en LA.",
  "help.ICLC.description": "Bufete de derecho de pobreza que combate la falta de vivienda y la pérdida de vivienda de inquilinos de bajos ingresos, veteranos y personas con discapacidad en LA.",
  "help.NLSLA.description": "Ayuda legal gratuita para defensa contra desalojos, control de rentas y discriminación de vivienda para residentes de bajos ingresos en todo el Condado de LA.",
  "disclaimer.text": "⚠️ Esto es una estimación basada en registros públicos, no una consulta del registro de LAHD, y no es asesoría legal. Confirme siempre con LAHD antes de actuar. Cifras legales verificadas por última vez el {lastVerified}.",
  "meta.title": "RentRights — derechos del inquilino en LA, por dirección",
  "meta.description": "Herramienta gratuita y de código abierto que estima sus protecciones de renta en la Ciudad de Los Ángeles a partir de su dirección. No es asesoría legal."
}
```

- [ ] **Step 4: Write the code-coverage test**

Create `tests/i18n/coverage.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CATALOG, Locale } from '@/lib/i18n/catalog';
import { ALL_REASON_CODES, ALL_WARNING_CODES, ALL_ERROR_CODES } from '@/lib/rules/types';
import { QuestionId, Regime } from '@/lib/rules/types';

const LOCALES: Locale[] = ['en', 'es'];
const QUESTION_IDS: QuestionId[] = ['BUILT_BEFORE_OCT_1978', 'IS_SEPARATE_HOUSE', 'AB1482_EXEMPTION_NOTICE', 'IS_CONDO'];
const REGIMES: Regime[] = ['RSO', 'AB1482', 'JCO_ONLY', 'OUT_OF_JURISDICTION', 'UNKNOWN'];

function has(locale: Locale, key: string) {
  return typeof CATALOG[locale][key] === 'string' && CATALOG[locale][key].length > 0;
}

describe('catalog code coverage', () => {
  it('has reason.<code> for every ReasonCode in both locales', () => {
    for (const l of LOCALES) for (const c of ALL_REASON_CODES) expect(has(l, `reason.${c}`)).toBe(true);
  });
  it('has warning.<code> and error.<code> in both locales', () => {
    for (const l of LOCALES) {
      for (const c of ALL_WARNING_CODES) expect(has(l, `warning.${c}`)).toBe(true);
      for (const c of ALL_ERROR_CODES) expect(has(l, `error.${c}`)).toBe(true);
    }
  });
  it('has question.<id>.{q,yes,no} for every QuestionId in both locales', () => {
    for (const l of LOCALES) for (const id of QUESTION_IDS) {
      expect(has(l, `question.${id}.q`)).toBe(true);
      expect(has(l, `question.${id}.yes`)).toBe(true);
      expect(has(l, `question.${id}.no`)).toBe(true);
    }
  });
  it('has rights.<regime>.title for every Regime in both locales', () => {
    for (const l of LOCALES) for (const r of REGIMES) expect(has(l, `rights.${r}.title`)).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests + tsc**

Run: `npx vitest run tests/i18n/` then `npx tsc --noEmit`
Expected: completeness + coverage pass; tsc clean. (Existing app tests still green — no behavior changed.)

- [ ] **Step 6: Commit**
```powershell
git add messages lib/rules/types.ts tests/i18n/coverage.test.ts
git commit -m "feat(i18n): full EN/ES catalog + code-union types + coverage tests"
```

---

## Task 3: Engine reasons → ReasonItem[] + render via useT

**Files:**
- Modify: `lib/rules/types.ts` (`RegimeResult.reasons`), `lib/rules/engine.ts`, `components/ResultCard.tsx`
- Test: `tests/rules/engine.test.ts` (reason-code assertions), `tests/api/lookup.test.ts` (mock shape)

- [ ] **Step 1: Flip the type**

In `lib/rules/types.ts`, change `RegimeResult`:
```ts
export interface RegimeResult {
  regime: Regime;
  confidence: Confidence;
  reasons: ReasonItem[];
  questions: QuestionId[];
}
```

- [ ] **Step 2: Update the two reason-substring engine tests to assert on codes**

In `tests/rules/engine.test.ts`, replace the line:
```ts
    expect(r.reasons.some((x) => x.includes('within the last 15 years'))).toBe(true);
```
with:
```ts
    expect(r.reasons.some((x) => x.code === 'NEW_CONSTRUCTION_EXEMPT')).toBe(true);
```
and replace:
```ts
    expect(r.reasons.some((x) => x.toLowerCase().includes('unincorporated'))).toBe(true);
```
with:
```ts
    expect(r.reasons.some((x) => x.code === 'UNINCORPORATED_COUNTY')).toBe(true);
```

- [ ] **Step 3: Run engine test to verify it fails**

Run: `npx vitest run tests/rules/engine.test.ts`
Expected: FAIL (and/or tsc errors) — engine still pushes strings.

- [ ] **Step 4: Convert every `reasons.push` in `lib/rules/engine.ts` to a `ReasonItem`**

Update the import line to include `ReasonItem`:
```ts
import { Confidence, Jurisdiction, ParcelFacts, QuestionId, ReasonItem, RegimeResult, UserAnswers } from './types';
```
Then make each push emit a code. Apply these exact replacements:
- Unincorporated branch (was the array literal): `reasons: [{ code: 'UNINCORPORATED_COUNTY' }],`
- Out-of-LA branch: `reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: jurisdiction.placeName } }],`
- Change `const reasons: string[] = ['In the City of Los Angeles'];` to `const reasons: ReasonItem[] = [{ code: 'IN_LA_CITY' }];`
- `reasons.push(builtBefore ? 'You said it was built before Oct 1, 1978' : 'You said it was built after Oct 1978');` → `reasons.push({ code: builtBefore ? 'SAID_BUILT_BEFORE_1978' : 'SAID_BUILT_AFTER_1978' });`
- `reasons.push(\`Built in ${facts.yearBuilt} (before the Oct 1, 1978 RSO cutoff)\`);` → `reasons.push({ code: 'BUILT_BEFORE_CUTOFF', params: { year: facts.yearBuilt } });`
- `reasons.push(\`Built in ${facts.yearBuilt} (after the RSO cutoff)\`);` → `reasons.push({ code: 'BUILT_AFTER_CUTOFF', params: { year: facts.yearBuilt } });`
- `reasons.push('Built in 1978 — the exact certificate-of-occupancy date determines RSO coverage');` → `reasons.push({ code: 'BUILT_1978_AMBIGUOUS' });`
- `reasons.push('You said this is an individually-owned condo (treated like a single-family home for rent-cap rules)');` → `reasons.push({ code: 'SAID_CONDO' });`
- `reasons.push('You said the other unit is a separate house (treated as single-family)');` → `reasons.push({ code: 'SAID_SEPARATE_HOUSE' });`
- `reasons.push(\`${facts.units} units on the parcel\`);` → `reasons.push({ code: 'UNITS_COUNT', params: { count: facts.units } });`
- `reasons.push('2 units on the parcel');` → `reasons.push({ code: 'TWO_UNITS' });`
- `reasons.push('Single unit on the parcel (single-family)');` → `reasons.push({ code: 'SINGLE_UNIT' });`
- The new-construction block: replace
  ```ts
        reasons.push(
          `Built in ${facts.yearBuilt} — within the last 15 years, so likely exempt from AB 1482's rent cap (new construction). Citywide Just Cause still applies.`,
        );
        if (nearCutoff) {
          reasons.push('This is near the 15-year cutoff — the exact certificate-of-occupancy date may affect this.');
        }
  ```
  with
  ```ts
        reasons.push({ code: 'NEW_CONSTRUCTION_EXEMPT', params: { year: facts.yearBuilt } });
        if (nearCutoff) {
          reasons.push({ code: 'NEAR_15YR_CUTOFF' });
        }
  ```
- `reasons.push('Built after the RSO cutoff with multiple units → AB 1482 applies');` → `reasons.push({ code: 'MULTIUNIT_AB1482' });`
- `reasons.push('Multiple units, but the build date is uncertain → likely RSO pending confirmation');` → `reasons.push({ code: 'MULTIUNIT_BUILDDATE_UNCERTAIN' });`
- `reasons.push('Single-family/condo may be exempt from AB 1482 rent caps (depends on a landlord notice)');` → `reasons.push({ code: 'SFR_MAYBE_EXEMPT' });`
- `reasons.push('Landlord gave an AB 1482 exemption notice → no state rent cap, but citywide Just Cause still applies');` → `reasons.push({ code: 'EXEMPTION_NOTICE_GIVEN' });`
- `reasons.push('No AB 1482 exemption notice → AB 1482 rent cap applies');` → `reasons.push({ code: 'NO_EXEMPTION_NOTICE' });`

- [ ] **Step 5: Render reasons via useT in `components/ResultCard.tsx`**

Make `ResultCard` a client component and localize the reasons list. Replace the top two lines:
```tsx
import { RegimeResult } from '@/lib/rules/types';
import { RIGHTS_TEXT, capLabel, capStaleness, stalenessMessage } from '@/lib/content/rights';
```
with:
```tsx
'use client';
import { RegimeResult } from '@/lib/rules/types';
import { RIGHTS_TEXT, capLabel, capStaleness, stalenessMessage } from '@/lib/content/rights';
import { useT } from '@/lib/i18n/LocaleProvider';
```
Inside `ResultCard`, add `const t = useT();` as the first line of the function body (before `const rights = ...`). Then replace the reasons list:
```tsx
        {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
```
with:
```tsx
        {result.reasons.map((r, i) => <li key={i}>{t(`reason.${r.code}`, r.params)}</li>)}
```
(Leave the rest of ResultCard — rights title/points, confidence, capLabel, staleness — in English for now; Task 6 localizes them.)

- [ ] **Step 6: Fix the API test mock shape**

In `tests/api/lookup.test.ts`, the mocked `lookup` returns `reasons: ['In the City of Los Angeles']`. Change it to:
```ts
      result: { regime: 'RSO', confidence: 'high', reasons: [{ code: 'IN_LA_CITY' }], questions: [] },
```

- [ ] **Step 7: Run engine + api tests + tsc + full suite**

Run: `npx vitest run tests/rules/engine.test.ts tests/api/lookup.test.ts` then `npx tsc --noEmit` then `npm test`
Expected: all green, tsc clean. (`lib/compute/lookup.ts` passes `result` through unchanged — no edit needed.)

- [ ] **Step 8: Commit**
```powershell
git add lib/rules/types.ts lib/rules/engine.ts components/ResultCard.tsx tests/rules/engine.test.ts tests/api/lookup.test.ts
git commit -m "feat(i18n): engine emits reason codes; ResultCard renders reasons via useT"
```

---

## Task 4: dataWarnings → WarningCode[] + render via useT

**Files:**
- Modify: `lib/compute/lookup.ts`, `app/page.tsx`
- Test: `tests/compute/lookup.test.ts`

- [ ] **Step 1: Update the lookup test to assert on a warning code**

In `tests/compute/lookup.test.ts`, find the test that asserts `res.dataWarnings.length` is greater than 0 and change its assertion to:
```ts
    expect(res.dataWarnings).toContain('DATA_INCOMPLETE');
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/compute/lookup.test.ts`
Expected: FAIL — dataWarnings still hold English strings.

- [ ] **Step 3: Convert dataWarnings to codes**

In `lib/compute/lookup.ts`:
- Update the import: `import { Jurisdiction, ParcelFacts, RegimeResult, UserAnswers, WarningCode } from '@/lib/rules/types';`
- Change `LookupResult.dataWarnings: string[]` → `dataWarnings: WarningCode[]`.
- Change `const dataWarnings: string[] = [];` → `const dataWarnings: WarningCode[] = [];`.
- Replace the `DATA_INCOMPLETE` push:
  ```ts
        dataWarnings.push(
          'We could not read full property records for this address, so we will ask you a couple of questions.',
        );
  ```
  with `dataWarnings.push('DATA_INCOMPLETE');`
- Replace `dataWarnings.push('Property records are temporarily unavailable; answers below are based only on your responses.');` with `dataWarnings.push('RECORDS_UNAVAILABLE');`

- [ ] **Step 4: Render warnings via useT in `app/page.tsx`**

In `app/page.tsx`, add `import { useT } from '@/lib/i18n/LocaleProvider';` and add `const t = useT();` at the top of `Home()`. Replace the warnings map:
```tsx
          {data.dataWarnings?.map((w: string, i: number) => (
            <p key={i} className="mt-3 text-xs text-gray-500">{w}</p>
          ))}
```
with:
```tsx
          {data.dataWarnings?.map((w: string, i: number) => (
            <p key={i} className="mt-3 text-xs text-gray-500">{t(`warning.${w}`)}</p>
          ))}
```

- [ ] **Step 5: Run lookup test + tsc + full suite**

Run: `npx vitest run tests/compute/lookup.test.ts` then `npx tsc --noEmit` then `npm test`
Expected: all green.

- [ ] **Step 6: Commit**
```powershell
git add lib/compute/lookup.ts app/page.tsx tests/compute/lookup.test.ts
git commit -m "feat(i18n): dataWarnings as codes, rendered via useT"
```

---

## Task 5: API errors → ErrorCode + client maps via useT

**Files:**
- Modify: `app/api/lookup/route.ts`, `app/page.tsx`
- Test: `tests/api/lookup.test.ts`

- [ ] **Step 1: Update the API test to assert the error code**

In `tests/api/lookup.test.ts`, the "400s when address is missing" test currently checks only `res.status`. Add a body assertion right after the status check:
```ts
    const data = await res.json();
    expect(data.error).toBe('ADDRESS_REQUIRED');
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/api/lookup.test.ts`
Expected: FAIL — route returns an English error string, not `'ADDRESS_REQUIRED'`.

- [ ] **Step 3: Return error codes from the route**

Rewrite `app/api/lookup/route.ts` body to use codes:
```ts
import { NextResponse } from 'next/server';
import { lookup, AddressNotFoundError } from '@/lib/compute/lookup';
import { ErrorCode, UserAnswers } from '@/lib/rules/types';

export const runtime = 'nodejs';

function err(code: ErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: Request) {
  let body: { address?: string; answers?: UserAnswers };
  try {
    body = await request.json();
  } catch {
    return err('INVALID_BODY', 400);
  }

  const address = body.address?.trim();
  if (!address) return err('ADDRESS_REQUIRED', 400);

  try {
    const result = await lookup(address, body.answers ?? {});
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AddressNotFoundError) return err('ADDRESS_NOT_FOUND', 404);
    return err('UPSTREAM_ERROR', 502);
  }
}
```

- [ ] **Step 4: Map the error code to a localized message in `app/page.tsx`**

In `app/page.tsx`, the `run` function stores `json.error` directly into `error` state and renders it. The error is now a code. Change the error state handling and render so a code becomes a localized string. In `run`, replace:
```tsx
      if (!res.ok) { setError(json.error ?? 'Error'); setData(null); }
```
with:
```tsx
      if (!res.ok) { setError(json.error ?? 'UPSTREAM_ERROR'); setData(null); }
```
and replace the network catch:
```tsx
    } catch { setError('Network error. Please try again.'); }
```
with:
```tsx
    } catch { setError('__NETWORK__'); }
```
Then change the error render line:
```tsx
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
```
to:
```tsx
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error === '__NETWORK__' ? t('page.networkError') : t(`error.${error}`)}
        </p>
      )}
```
(`t` is already in scope from Task 4.)

- [ ] **Step 5: Run api test + tsc + full suite**

Run: `npx vitest run tests/api/lookup.test.ts` then `npx tsc --noEmit` then `npm test`
Expected: all green.

- [ ] **Step 6: Commit**
```powershell
git add app/api/lookup/route.ts app/page.tsx tests/api/lookup.test.ts
git commit -m "feat(i18n): API returns error codes; client localizes them"
```

---

## Task 6: Localize content + remaining UI (rights, help, components, page chrome)

**Files:**
- Modify: `lib/content/rights.ts`, `lib/content/help.ts`, `components/ResultCard.tsx`, `components/ConfirmingQuestions.tsx`, `components/Disclaimer.tsx`, `components/GetHelp.tsx`, `app/page.tsx`
- Test: `tests/content/rights.test.ts`

- [ ] **Step 1: Update the rights test for the new signatures**

Replace the entire `tests/content/rights.test.ts` with a version that passes a real `t` built from the EN catalog:
```ts
import { describe, it, expect } from 'vitest';
import { capStaleness, stalenessMessage, rightsText, capLabel } from '@/lib/content/rights';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';

const t = (key: string, params?: Record<string, string | number>) => translate(CATALOG.en, key, params, CATALOG.en);

describe('capStaleness', () => {
  it('returns null for regimes without a rent cap', () => {
    expect(capStaleness('JCO_ONLY', new Date('2026-06-02'))).toBeNull();
    expect(capStaleness('OUT_OF_JURISDICTION', new Date('2026-06-02'))).toBeNull();
  });
  it('is not stale for RSO on 2026-06-02', () => {
    expect(capStaleness('RSO', new Date('2026-06-02'))?.stale).toBe(false);
  });
  it('flags RSO as pending once the new-formula period begins', () => {
    const s = capStaleness('RSO', new Date('2026-08-01'));
    expect(s?.stale).toBe(true);
    expect(s?.reason).toBe('pending publication');
  });
});

describe('stalenessMessage', () => {
  it('mentions the expected update date when present', () => {
    const msg = stalenessMessage({ stale: true, reason: 'past expected update', expectedUpdate: '2026-08-01' }, t);
    expect(msg).toContain('2026-08-01');
    expect(msg.toLowerCase()).toContain('lahd');
  });
  it('points AB1482 figures to the state, not LAHD', () => {
    const msg = stalenessMessage({ stale: true, reason: 'pending publication', expectedUpdate: '2027-08-01' }, t, 'AB1482');
    expect(msg.toLowerCase()).not.toContain('lahd');
    expect(msg.toLowerCase()).toContain('state');
  });
});

describe('rightsText', () => {
  it('returns a localized title and points for RSO', () => {
    const r = rightsText('RSO', t);
    expect(r.title).toContain('Rent Stabilization');
    expect(r.points.length).toBe(4);
  });
});

describe('capLabel', () => {
  it('formats the RSO cap on 2026-06-02', () => {
    expect(capLabel('RSO', t, new Date('2026-06-02'))).toBe('up to 3%');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/content/rights.test.ts`
Expected: FAIL — `rightsText` does not exist; `capLabel`/`stalenessMessage` have old signatures.

- [ ] **Step 3: Rewrite `lib/content/rights.ts` to be `t`-driven**

Replace the whole file with:
```ts
import { LEGAL } from '@/lib/legal/constants';
import { Regime } from '@/lib/rules/types';
import { stalenessFor, Staleness } from '@/lib/legal/staleness';

type T = (key: string, params?: Record<string, string | number>) => string;

export function capLabel(regime: Regime, t: T, onDate = new Date()): string {
  const d = onDate.toISOString().slice(0, 10);
  if (regime === 'RSO') {
    const p = LEGAL.rsoCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    if (!p) return t('result.capSeeLahd');
    return p.value != null
      ? t('result.capUpTo', { pct: p.value })
      : t('result.capRsoPending', { floor: p.floorPct ?? 1, ceiling: p.ceilingPct ?? 4 });
  }
  if (regime === 'AB1482') {
    const p = LEGAL.ab1482CapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p ? t('result.capUpTo', { pct: p.value }) : t('result.capSeeState');
  }
  return t('result.capNone');
}

const RIGHTS_POINTS: Record<Regime, number> = {
  RSO: 4, AB1482: 4, JCO_ONLY: 3, OUT_OF_JURISDICTION: 1, UNKNOWN: 1,
};

export function rightsText(regime: Regime, t: T): { title: string; points: string[] } {
  const n = RIGHTS_POINTS[regime];
  const points: string[] = [];
  for (let i = 1; i <= n; i++) points.push(t(`rights.${regime}.point${i}`));
  return { title: t(`rights.${regime}.title`), points };
}

export function capStaleness(regime: Regime, onDate = new Date()): Staleness | null {
  if (regime === 'RSO') return stalenessFor(LEGAL.rsoCapPct, onDate);
  if (regime === 'AB1482') return stalenessFor(LEGAL.ab1482CapPct, onDate);
  return null;
}

export function stalenessMessage(s: Staleness, t: T, regime?: Regime): string {
  const when = s.expectedUpdate ? t('staleness.whenSuffix', { date: s.expectedUpdate }) : '';
  const who = regime === 'AB1482' ? t('staleness.authority.state') : t('staleness.authority.lahd');
  if (s.reason === 'pending publication') return t('staleness.pending', { when, who });
  if (s.reason === 'past expected update') return t('staleness.pastUpdate', { when, who });
  return t('staleness.generic', { when, who });
}
```
> Note: `RIGHTS_TEXT` is removed. ResultCard (Step 6) switches to `rightsText`.

- [ ] **Step 4: Switch `help.ts` to `descriptionKey`**

In `lib/content/help.ts`: change the interface field `description: string;` → `descriptionKey: string;`. For each of the 8 orgs, replace the `description: '...'` line with the matching key:
- LAHD → `descriptionKey: 'help.LAHD.description',`
- Stay Housed LA → `descriptionKey: 'help.STAY_HOUSED.description',`
- SAJE → `descriptionKey: 'help.SAJE.description',`
- Legal Aid Foundation of Los Angeles (LAFLA) → `descriptionKey: 'help.LAFLA.description',`
- LA County DCBA → `descriptionKey: 'help.DCBA.description',`
- Coalition for Economic Survival (CES) → `descriptionKey: 'help.CES.description',`
- Inner City Law Center → `descriptionKey: 'help.ICLC.description',`
- Neighborhood Legal Services of LA County (NLSLA) → `descriptionKey: 'help.NLSLA.description',`
(Leave `name`, `url`, `phone`, `languages`, `tags`, and `orgsFor` unchanged.)

- [ ] **Step 5: Localize `components/GetHelp.tsx`**

Replace its contents with:
```tsx
'use client';
import { orgsFor } from '@/lib/content/help';
import { useT } from '@/lib/i18n/LocaleProvider';

export function GetHelp({ unincorporatedCounty = false }: { unincorporatedCounty?: boolean }) {
  const t = useT();
  const orgs = orgsFor({ unincorporatedCounty });
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">{t('help.title')}</h2>
      <ul className="mt-2 space-y-3">
        {orgs.map((o) => (
          <li key={o.name} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm font-semibold">{o.name}</p>
            <p className="text-sm text-gray-600">{t(o.descriptionKey)}</p>
            <div className="mt-1 flex gap-3 text-sm">
              <a className="text-blue-600 underline" href={o.url} target="_blank" rel="noopener noreferrer">
                {t('help.website')}
              </a>
              {o.phone && (
                <a className="text-blue-600 underline" href={`tel:${o.phone.replace(/[^0-9+]/g, '')}`}>
                  {o.phone}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 6: Localize `components/ResultCard.tsx` (rights, confidence, cap, staleness, banner)**

Replace the whole file with:
```tsx
'use client';
import { RegimeResult } from '@/lib/rules/types';
import { rightsText, capLabel, capStaleness, stalenessMessage } from '@/lib/content/rights';
import { useT } from '@/lib/i18n/LocaleProvider';

export function ResultCard({ result }: { result: RegimeResult }) {
  const t = useT();
  const rights = rightsText(result.regime, t);
  return (
    <div className="rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{t('result.whatRecordsShow')}</p>
      <ul className="mt-1 mb-3 list-disc pl-5 text-sm text-gray-700">
        {result.reasons.map((r, i) => <li key={i}>{t(`reason.${r.code}`, r.params)}</li>)}
      </ul>
      <p className="text-lg font-bold">{t('result.likelyPrefix')} {rights.title}</p>
      {result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN' && (
        <>
          <span className="mt-1 inline-block rounded-full border border-green-700 bg-green-50 px-3 py-0.5 text-xs font-semibold text-green-700">
            {t(`result.confidence.${result.confidence}`)}
          </span>
          <p className="mt-3 text-sm text-gray-500">{t('result.legalIncrease')}</p>
          <p className="text-2xl font-extrabold text-green-700">{capLabel(result.regime, t)}</p>
          {(() => {
            const s = capStaleness(result.regime);
            return s?.stale ? <p className="mt-1 text-xs text-gray-400">⚠ {stalenessMessage(s, t, result.regime)}</p> : null;
          })()}
        </>
      )}
      <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
        {rights.points.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-semibold text-amber-800">
        {t('result.notFinal')}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Localize `components/ConfirmingQuestions.tsx`**

Replace its contents with:
```tsx
'use client';
import { QuestionId, UserAnswers } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';

const QUESTION_META: Record<QuestionId, { key: keyof UserAnswers; yesValue: boolean }> = {
  BUILT_BEFORE_OCT_1978: { key: 'builtBeforeOct1978', yesValue: true },
  IS_SEPARATE_HOUSE: { key: 'isSeparateHouse', yesValue: true },
  AB1482_EXEMPTION_NOTICE: { key: 'hasAb1482ExemptionNotice', yesValue: true },
  IS_CONDO: { key: 'isCondo', yesValue: true },
};

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
        return (
          <div key={id} className="rounded-xl border border-gray-200 p-3">
            <p className="text-sm">{t(`question.${id}.q`)}</p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onAnswer({ ...answers, [m.key]: m.yesValue })}>{t(`question.${id}.yes`)}</button>
              <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onAnswer({ ...answers, [m.key]: !m.yesValue })}>{t(`question.${id}.no`)}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 8: Localize `components/Disclaimer.tsx`**

Replace its contents with:
```tsx
'use client';
import { useT } from '@/lib/i18n/LocaleProvider';

export function Disclaimer({ lastVerified }: { lastVerified: string }) {
  const t = useT();
  return <p className="mt-6 text-xs text-gray-500">{t('disclaimer.text', { lastVerified })}</p>;
}
```

- [ ] **Step 9: Localize the page chrome in `app/page.tsx`**

In `app/page.tsx`, localize the static strings (the heading/tagline/placeholder/button). Replace:
```tsx
      <h1 className="text-2xl font-extrabold text-blue-700">RentRights</h1>
      <p className="text-sm text-gray-500">Know your renter rights in the City of LA — free, no sign-up, nothing stored.</p>
```
with:
```tsx
      <h1 className="text-2xl font-extrabold text-blue-700">{t('page.title')}</h1>
      <p className="text-sm text-gray-500">{t('page.tagline')}</p>
```
Replace the input/button in the form:
```tsx
        <input className="flex-1 rounded-lg border px-3 py-2" placeholder="1234 S Main St, Los Angeles" value={address} onChange={(e) => setAddress(e.target.value)} />
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" disabled={loading}>{loading ? '…' : 'Check'}</button>
```
with:
```tsx
        <input className="flex-1 rounded-lg border px-3 py-2" placeholder={t('page.placeholder')} value={address} onChange={(e) => setAddress(e.target.value)} />
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" disabled={loading}>{loading ? t('page.loading') : t('page.check')}</button>
```

- [ ] **Step 10: Run rights test + tsc + full suite + build**

Run: `npx vitest run tests/content/rights.test.ts` then `npx tsc --noEmit` then `npm test` then `npm run build`
Expected: all green, build succeeds. (Everything renders in English because no `LocaleProvider` is mounted yet — that is Task 7.)

- [ ] **Step 11: Commit**
```powershell
git add lib/content components app/page.tsx tests/content/rights.test.ts
git commit -m "feat(i18n): localize rights/help content and all UI components via useT"
```

---

## Task 7: Wire LocaleProvider into layout (cookie + Accept-Language) + language toggle

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Make `layout.tsx` detect locale, set `<html lang>`, localize metadata, and mount the provider**

Replace `app/layout.tsx` with:
```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n/LocaleProvider';
import { pickInitialLocale } from '@/lib/i18n/detect';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

async function getLocale() {
  const cookieValue = (await cookies()).get('rr_locale')?.value;
  const acceptLanguage = (await headers()).get('accept-language');
  return pickInitialLocale(cookieValue, acceptLanguage);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: translate(CATALOG[locale], 'meta.title', undefined, CATALOG.en),
    description: translate(CATALOG[locale], 'meta.description', undefined, CATALOG.en),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add the EN/ES toggle to `app/page.tsx`**

In `app/page.tsx`, add `useLocale` to the i18n import:
```tsx
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
```
Add `const { locale, setLocale } = useLocale();` near `const t = useT();`. Then add a toggle in the header — replace:
```tsx
      <h1 className="text-2xl font-extrabold text-blue-700">{t('page.title')}</h1>
      <p className="text-sm text-gray-500">{t('page.tagline')}</p>
```
with:
```tsx
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-blue-700">{t('page.title')}</h1>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            aria-pressed={locale === 'en'}
            className={`rounded px-2 py-1 ${locale === 'en' ? 'bg-blue-600 text-white' : 'border'}`}
            onClick={() => setLocale('en')}
          >
            {t('page.langEnglish')}
          </button>
          <button
            type="button"
            aria-pressed={locale === 'es'}
            className={`rounded px-2 py-1 ${locale === 'es' ? 'bg-blue-600 text-white' : 'border'}`}
            onClick={() => setLocale('es')}
          >
            {t('page.langSpanish')}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500">{t('page.tagline')}</p>
```

- [ ] **Step 3: Build + full suite**

Run: `npm run build` then `npm test` then `npx tsc --noEmit`
Expected: build succeeds, all tests pass, tsc clean.

- [ ] **Step 4: Commit**
```powershell
git add app/layout.tsx app/page.tsx
git commit -m "feat(i18n): locale detection in layout + EN/ES toggle"
```

---

## Task 8: Final verification

**Files:** none (verification + branch completion)

- [ ] **Step 1: Full suite + build**

Run: `npm test` then `npm run build` then `npx tsc --noEmit`
Expected: all green; `/` static, `/api/lookup` dynamic.

- [ ] **Step 2: Manual verification (live dev server)**

Run: `npm run dev`, then at `http://localhost:3000`:
- Default (English browser) loads in English. Toggle **ES** → tagline, button, and (after a lookup) result card, evidence reasons, confidence, cap label, rights points, confirming questions, get-help directory, and disclaimer all render in Spanish.
- Reload after choosing ES → still Spanish (cookie persisted).
- With a Spanish `Accept-Language` (e.g. a browser set to Spanish, or `curl -H "Accept-Language: es-MX" http://localhost:3000` and inspect `<html lang="es">` + Spanish metadata) and no `rr_locale` cookie → first load is Spanish.
- Spot-check `1411 Murray Dr, Los Angeles` in ES → RSO result with Spanish reasons ("En la Ciudad de Los Ángeles", "Construido en 1931…", "6 unidades en la parcela").

- [ ] **Step 3: Complete the development branch**

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch to verify tests, present merge/PR/keep/discard options, and execute the choice.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §2.1 i18n core (translate/detect/catalog/provider) → Task 1. §2.6 catalog keys → Task 2 (full EN/ES) ; §5 ES authored by Claude → Task 2 (legal-review flag already in [[rentrights-gethelp-needs-legal-signoff]] memory + spec §1). §2.2 engine reason codes → Tasks 2 (types) + 3 (flip). §2.3 dataWarnings/API codes → Tasks 4, 5. §2.4 content (rights/help) → Task 6. §2.5 components/page/layout + toggle + detection → Tasks 6, 7. §5 tests: translate/detect/completeness/coverage → Tasks 1, 2; engine code assertions → Task 3; manual → Task 8. EN-only-default + Accept-Language → Task 7 via `pickInitialLocale`. No path routing / share-link / E2E (correctly out of scope).
- **Placeholder scan:** No "TBD/TODO". Every code/JSON block is complete. The full EN and ES catalogs are authored inline in Task 2 (not deferred). Spanish legal terminology is real text flagged for the legal-review track, not a placeholder.
- **Type consistency:** `Locale` defined in `catalog.ts` (Task 1), used by `detect`/provider/layout. `ReasonCode`/`ReasonItem`/`WarningCode`/`ErrorCode` + the `ALL_*` arrays defined in Task 2, consumed by engine (Task 3), lookup (Task 4), route (Task 5), coverage test (Task 2). `RegimeResult.reasons` flipped to `ReasonItem[]` in Task 3 with its only string-asserting tests updated in the same task. `translate(messages,key,params?,fallback?)`, `useT(): (key,params?)=>string`, `rightsText(regime,t)`, `capLabel(regime,t,onDate?)`, `stalenessMessage(s,t,regime?)` signatures consistent across definition and all call sites. `descriptionKey` replaces `description` in `help.ts` and `GetHelp` together. Catalog key names in JSON exactly match every `t('...')`/coverage-test reference (e.g. `reason.<ReasonCode>`, `question.<QuestionId>.{q,yes,no}`, `rights.<Regime>.{title,pointN}`, `warning.<WarningCode>`, `error.<ErrorCode>`).
- **Green-at-every-commit:** `useT()` defaults to English with no provider, so Tasks 3–6 render correctly before the provider is mounted in Task 7. Each task ends with `tsc --noEmit` + `npm test` (Vitest transpiles without type-checking, so `tsc` is the real build gate — this caught the M2-A `IS_CONDO` regression).

## Out of M2-B scope → future
- **M2-C:** share link/save (lock locale into the shared link). **M2-D:** Playwright E2E incl. language switch. **Future locales:** add to `Locale` union + a `messages/<l>.json`. **Parallel:** ES legal terminology + get-help data review by the legal-org partner ([[rentrights-gethelp-needs-legal-signoff]]).
