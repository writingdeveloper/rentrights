import { describe, it, expect } from 'vitest';
import { capStaleness, stalenessMessage, rightsText, capLabel, isCovered, caveatAuthorityKey, capPeriodFor, upcomingCapChange } from '@/lib/content/rights';
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
  it('is not stale for RSO/County in the published 2026-07 window', () => {
    // LAHD 3% + DCBA 1.919% are published for 2026-07-01–2027-06-30 (verified 2026-07-07).
    expect(capStaleness('RSO', new Date('2026-08-01'))?.stale).toBe(false);
    expect(capStaleness('COUNTY_RSTPO', new Date('2026-08-01'))?.stale).toBe(false);
  });
  it('flags RSO as pending once the next new-formula period begins (2027-07-01)', () => {
    const s = capStaleness('RSO', new Date('2027-08-01'));
    expect(s?.stale).toBe(true);
    expect(s?.reason).toBe('pending publication');
  });
  it('flags County RSTPO as pending once the published figure lapses (after 2027-06-30)', () => {
    const s = capStaleness('COUNTY_RSTPO', new Date('2027-08-01'));
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
  it('formats the published 2026-07 figures (RSO 3%, County 1.919%)', () => {
    expect(capLabel('RSO', t, new Date('2026-08-01'))).toBe('up to 3%');
    expect(capLabel('COUNTY_RSTPO', t, new Date('2026-08-01'))).toBe('up to 1.919%');
  });
  it('formats the County cap as pending (ceiling-only) after 2027-06-30', () => {
    expect(capLabel('COUNTY_RSTPO', t, new Date('2027-08-01'))).toContain('up to 3%');
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

describe('caveatAuthorityKey (increase-checker routing)', () => {
  it('routes incorporated-city renters to a generic city office, never LAHD', () => {
    expect(caveatAuthorityKey('AB1482', true)).toBe('staleness.authority.cityGeneric');
    expect(t(caveatAuthorityKey('AB1482', true)).toLowerCase()).not.toContain('lahd');
  });
  it('routes City-of-LA RSO/AB1482 to LAHD', () => {
    expect(caveatAuthorityKey('AB1482', false)).toBe('staleness.authority.lahd');
    expect(caveatAuthorityKey('RSO')).toBe('staleness.authority.lahd');
  });
  it('routes County regimes to DCBA', () => {
    expect(caveatAuthorityKey('COUNTY_RSTPO')).toBe('staleness.authority.dcba');
    expect(caveatAuthorityKey('COUNTY_JCO')).toBe('staleness.authority.dcba');
  });
});

describe('capPeriodFor', () => {
  it('returns the active RSO period with its dated source', () => {
    const p = capPeriodFor('RSO', new Date('2026-06-02'));
    expect(p?.value).toBe(3);
    expect(p?.source).toBe('LAHD');
  });
  it('returns the published RSO 3% period in the 2026-07 window', () => {
    expect(capPeriodFor('RSO', new Date('2026-08-01'))?.value).toBe(3);
  });
  it('returns the pending (null) RSO period after 2027-06-30', () => {
    expect(capPeriodFor('RSO', new Date('2027-08-01'))?.value).toBeNull();
  });
  it('returns null for regimes without a cap', () => {
    expect(capPeriodFor('JCO_ONLY')).toBeNull();
    expect(capPeriodFor('COUNTY_JCO')).toBeNull();
  });
});

describe('upcomingCapChange', () => {
  it('flags the July 1, 2027 RSO change inside the 90-day window', () => {
    expect(upcomingCapChange('RSO', new Date('2027-06-22'))).toEqual({ date: '2027-07-01' });
  });
  it('flags the County change too', () => {
    expect(upcomingCapChange('COUNTY_RSTPO', new Date('2027-06-22'))).toEqual({ date: '2027-07-01' });
  });
  it('does not flag when the change is more than 90 days out', () => {
    expect(upcomingCapChange('RSO', new Date('2026-03-01'))).toBeNull();
  });
  it('does not flag once the pending figure is already in effect', () => {
    expect(upcomingCapChange('RSO', new Date('2026-08-01'))).toBeNull();
  });
  it('returns null for AB1482 (next figure already known, not pending)', () => {
    expect(upcomingCapChange('AB1482', new Date('2026-06-22'))).toBeNull();
  });
});
