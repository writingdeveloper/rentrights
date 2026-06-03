import { describe, it, expect } from 'vitest';
import { CATALOG } from '@/lib/i18n/catalog';

describe('catalog completeness', () => {
  it('en and es have identical key sets', () => {
    const enKeys = Object.keys(CATALOG.en).sort();
    const esKeys = Object.keys(CATALOG.es).sort();
    expect(esKeys).toEqual(enKeys);
  });
});
