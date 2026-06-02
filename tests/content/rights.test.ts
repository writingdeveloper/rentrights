import { describe, it, expect } from 'vitest';
import { capStaleness, stalenessMessage } from '@/lib/content/rights';

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
    const msg = stalenessMessage({ stale: true, reason: 'past expected update', expectedUpdate: '2026-08-01' });
    expect(msg).toContain('2026-08-01');
    expect(msg.toLowerCase()).toContain('lahd');
  });

  it('points AB1482 figures to the state, not LAHD', () => {
    const msg = stalenessMessage({ stale: true, reason: 'pending publication', expectedUpdate: '2027-08-01' }, 'AB1482');
    expect(msg.toLowerCase()).not.toContain('lahd');
    expect(msg).toContain('state');
  });
});
