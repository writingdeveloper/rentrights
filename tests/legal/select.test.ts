import { describe, it, expect } from 'vitest';
import { selectDated, DatedValue } from '@/lib/legal/select';

const items: DatedValue<number>[] = [
  { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LAHD' },
  { value: 8.0, effectiveFrom: '2026-07-01', source: 'LAHD' },
];

describe('selectDated', () => {
  it('picks the value whose range contains the date', () => {
    expect(selectDated(items, new Date('2026-01-15'))?.value).toBe(3);
  });
  it('picks an open-ended (no effectiveTo) range', () => {
    expect(selectDated(items, new Date('2026-09-01'))?.value).toBe(8.0);
  });
  it('returns null when no range matches', () => {
    expect(selectDated(items, new Date('2020-01-01'))).toBeNull();
  });
});
