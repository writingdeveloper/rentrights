import { describe, it, expect } from 'vitest';
import { shareCardFields } from '@/lib/share/cardFields';
import { translate } from '@/lib/i18n/t';
import { CATALOG } from '@/lib/i18n/catalog';

const t = (k: string, p?: Record<string, string | number>) => translate(CATALOG.en, k, p, CATALOG.en);
const tEs = (k: string, p?: Record<string, string | number>) => translate(CATALOG.es, k, p, CATALOG.es);

describe('shareCardFields', () => {
  it('builds RSO fields with the dated cap, plain line, and as-of date', () => {
    const f = shareCardFields('RSO', t, '2026-06-19', new Date('2026-06-22'), 'en');
    expect(f.title).toContain('Rent Stabilization');
    expect(f.cap).toBe('up to 3%');
    expect(f.covered).toBe(true);
    expect(f.plain.toLowerCase()).toContain('in plain terms');
    expect(f.asOf).toBe('June 19, 2026');
  });

  it('localizes the as-of date and title in Spanish', () => {
    const f = shareCardFields('RSO', tEs, '2026-06-19', new Date('2026-06-22'), 'es');
    expect(f.asOf).toBe('19 de junio de 2026');
    expect(f.title).toContain('Estabilización');
  });

  it('marks an out-of-jurisdiction regime as not covered with no cap', () => {
    const f = shareCardFields('OUT_OF_JURISDICTION', t, '2026-06-19', new Date('2026-06-22'), 'en');
    expect(f.covered).toBe(false);
    expect(f.cap).toBeNull();
    expect(f.plain).toBe('');
  });
});
