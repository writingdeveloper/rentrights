import { describe, it, expect } from 'vitest';
import { cornerstoneRows, cornerstoneFaqs, cornerstoneStrings } from '@/lib/seo/cornerstone';

describe('cornerstoneRows', () => {
  it('carries the current dated cap + effective window per regime', () => {
    const rows = cornerstoneRows(new Date('2026-06-22'));
    expect(rows).toHaveLength(3);

    const rso = rows.find((r) => r.key === 'RSO')!;
    expect(rso.cap).toContain('3%');
    expect(rso.effective).toContain('2026');
    expect(rso.source).toBe('LAHD');

    const ab = rows.find((r) => r.key === 'AB1482')!;
    expect(ab.cap).toContain('8');

    const co = rows.find((r) => r.key === 'COUNTY_RSTPO')!;
    expect(co.cap).toMatch(/%/);
  });

  it('reflects the RSO pending range once the published figure lapses (after 2026-06-30)', () => {
    const rows = cornerstoneRows(new Date('2026-08-01'));
    const rso = rows.find((r) => r.key === 'RSO')!;
    expect(rso.cap).toMatch(/1[–-]4%/);
    expect(rso.cap.toLowerCase()).toContain('lahd');
  });
});

describe('cornerstoneFaqs', () => {
  it('produces answer-first Q/A pairs grounded in real figures', () => {
    const f = cornerstoneFaqs(new Date('2026-06-22'));
    expect(f.length).toBeGreaterThanOrEqual(5);
    for (const { q, a } of f) {
      expect(q.length).toBeGreaterThan(0);
      expect(a.length).toBeGreaterThan(0);
    }
    expect(f[0].a).toContain('3%');
  });

  it('the notice FAQ states the 30/90-day rule', () => {
    const f = cornerstoneFaqs(new Date('2026-06-22'));
    const notice = f.find((x) => x.q.toLowerCase().includes('notice'))!;
    expect(notice.a).toContain('30');
    expect(notice.a).toContain('90');
  });

  it('keeps the info-not-advice posture in the "is it legal" answer', () => {
    const f = cornerstoneFaqs(new Date('2026-06-22'));
    const legal = f.find((x) => x.q.toLowerCase().includes('legal'))!;
    expect(legal.a.toLowerCase()).toContain('not legal advice');
  });
});

describe('cornerstone ES (Spanish mirror)', () => {
  const now = new Date('2026-06-22');

  it('localizes the rows to Spanish while keeping the same dated figures', () => {
    const rows = cornerstoneRows(now, 'es');
    const rso = rows.find((r) => r.key === 'RSO')!;
    expect(rso.name).toContain('Ciudad de Los Ángeles');
    expect(rso.cap).toContain('hasta 3%');
    expect(rso.effective).toContain('2026');
  });

  it('produces Spanish answer-first FAQs with real figures', () => {
    const f = cornerstoneFaqs(now, 'es');
    expect(f.length).toBeGreaterThanOrEqual(5);
    expect(f[0].q.startsWith('¿')).toBe(true);
    expect(f[0].a).toContain('3%');
  });

  it('strings use usted Spanish and keep the info-not-advice posture', () => {
    const s = cornerstoneStrings(now, 'es');
    expect(s.h1).toContain('Los Ángeles');
    expect(s.lede).toContain('hasta');
    expect(s.disclaimer.toLowerCase()).toContain('no asesoría legal');
    expect(s.cta).toContain('Consulte');
  });
});
