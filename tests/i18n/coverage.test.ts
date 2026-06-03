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
