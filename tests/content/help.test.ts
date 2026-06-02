import { describe, it, expect } from 'vitest';
import { HELP_ORGS, orgsFor } from '@/lib/content/help';

describe('HELP_ORGS', () => {
  it('every org has a name, https url, and at least one tag', () => {
    expect(HELP_ORGS.length).toBeGreaterThanOrEqual(5);
    for (const o of HELP_ORGS) {
      expect(o.name.length).toBeGreaterThan(0);
      expect(o.url.startsWith('https://')).toBe(true);
      expect(o.tags.length).toBeGreaterThan(0);
    }
  });

  it('includes the four named partner organizations + a county resource', () => {
    const blob = HELP_ORGS.map((o) => o.name.toLowerCase()).join(' | ');
    expect(blob).toContain('lahd');
    expect(blob).toContain('stay housed');
    expect(blob).toContain('saje');
    expect(blob).toContain('legal aid'); // LAFLA = Legal Aid Foundation of Los Angeles
    expect(HELP_ORGS.some((o) => o.tags.includes('county'))).toBe(true);
  });

  it('puts a county resource first for unincorporated county', () => {
    const list = orgsFor({ unincorporatedCounty: true });
    expect(list[0].tags).toContain('county');
  });
});
