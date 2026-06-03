import { describe, it, expect } from 'vitest';
import { capStaleness, stalenessMessage, rightsText, capLabel, notFinalBanner } from '@/lib/content/rights';
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
