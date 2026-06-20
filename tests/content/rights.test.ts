import { describe, it, expect } from 'vitest';
import { capStaleness, stalenessMessage, rightsText, capLabel, notFinalBanner, isCovered } from '@/lib/content/rights';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';
import { LEGAL } from '@/lib/legal/constants';

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
  it('flags County RSTPO as pending once the published figure lapses (after 2026-06-30)', () => {
    const s = capStaleness('COUNTY_RSTPO', new Date('2026-08-01'));
    expect(s?.stale).toBe(true);
    expect(s?.reason).toBe('pending publication');
  });
});

describe('stalenessMessage', () => {
  it('mentions the expected update date when present (formatted, EN)', () => {
    // Default locale is 'en'; expects "August 1, 2026" (formatted), not raw ISO.
    const msg = stalenessMessage({ stale: true, reason: 'past expected update', expectedUpdate: '2026-08-01' }, t, undefined, 'en');
    expect(msg).toContain('August 1, 2026');
    expect(msg.toLowerCase()).toContain('lahd');
  });
  it('mentions the expected update date formatted in ES', () => {
    const msg = stalenessMessage({ stale: true, reason: 'past expected update', expectedUpdate: '2026-08-01' }, t, undefined, 'es');
    expect(msg).toContain('1 de agosto de 2026');
  });
  it('points AB1482 figures to the state, not LAHD', () => {
    const msg = stalenessMessage({ stale: true, reason: 'pending publication', expectedUpdate: '2027-08-01' }, t, 'AB1482', 'en');
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
  it('formats the County cap as pending (ceiling-only) after 2026-06-30', () => {
    expect(capLabel('COUNTY_RSTPO', t, new Date('2026-08-01'))).toContain('up to 3%');
  });
});

describe('notFinalBanner', () => {
  it('points city regimes (RSO/AB1482/JCO_ONLY) to LAHD with its hotline', () => {
    for (const regime of ['RSO', 'AB1482', 'JCO_ONLY'] as const) {
      const msg = notFinalBanner(regime, t);
      expect(msg).toContain('LAHD');
      expect(msg).toContain('(866) 557-7368');
    }
  });
  it('points County regimes to LA County DCBA with its hotline, not LAHD', () => {
    for (const regime of ['COUNTY_RSTPO', 'COUNTY_JCO'] as const) {
      const msg = notFinalBanner(regime, t);
      expect(msg).toContain('DCBA');
      expect(msg).toContain('(800) 593-8222');
      expect(msg).not.toContain('LAHD');
      expect(msg).not.toContain('(866) 557-7368');
    }
  });
  it('uses a generic local-authority message for OOJ/UNKNOWN (no specific agency phone)', () => {
    for (const regime of ['OUT_OF_JURISDICTION', 'UNKNOWN'] as const) {
      const msg = notFinalBanner(regime, t);
      expect(msg).not.toContain('(866) 557-7368');
      expect(msg).not.toContain('(800) 593-8222');
      expect(msg.toLowerCase()).toContain('local');
    }
  });
});

describe('isCovered', () => {
  it('is true for in-jurisdiction regimes', () => {
    for (const r of ['RSO', 'AB1482', 'JCO_ONLY', 'COUNTY_RSTPO', 'COUNTY_JCO'] as const) {
      expect(isCovered(r)).toBe(true);
    }
  });
  it('is false for OOJ and UNKNOWN', () => {
    expect(isCovered('OUT_OF_JURISDICTION')).toBe(false);
    expect(isCovered('UNKNOWN')).toBe(false);
  });
});

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

describe('reason copy', () => {
  it('pairs the SFR exemption with Just Cause and drops "parcel"', () => {
    expect(t('reason.SFR_MAYBE_EXEMPT').toLowerCase()).toContain('still apply');
    expect(t('reason.UNITS_COUNT', { count: 6 })).toBe('6 homes on the property');
    expect(t('reason.SINGLE_UNIT').toLowerCase()).not.toContain('parcel');
  });

  // Legal-critical regression guards (2026-06-04 review). Do not relax these copy
  // assertions without attorney sign-off — they protect against re-introducing the
  // two findings the review flagged for launch.
  it('Issue 1: exemption-notice reason names the non-corporate-owner condition, never asserts a flat "no rent cap"', () => {
    const r = t('reason.EXEMPTION_NOTICE_GIVEN').toLowerCase();
    expect(r).toContain('corporation');
    expect(r).not.toContain('no state rent cap');
  });
  it('Issue 2: separate-house help treats ADU/back house as multi-unit, not a single house', () => {
    const h = t('question.IS_SEPARATE_HOUSE.help').toLowerCase();
    expect(h).toContain('adu');
    expect(h).toContain('building with other units');
    expect(h).not.toContain('counts as a single house');
  });
});

describe('legal positioning (information, not advice)', () => {
  // Track 1: keep the tool firmly on the "legal information" side of the UPL line —
  // general information about the law, not advice about the user's specific situation.
  it('disclaimer frames the tool as general information, not advice about your situation', () => {
    const d = t('disclaimer.text', { lastVerified: '2026-06-04' }).toLowerCase();
    expect(d).toContain('general information');
    expect(d).toContain('not legal advice');
    expect(d).toContain('specific situation');
  });
  it('the "is this legal advice" FAQ draws the information-vs-advice line', () => {
    const a = t('faq.a6').toLowerCase();
    expect(a).toContain('general legal information');
    expect(a).toContain('specific situation');
  });
});
