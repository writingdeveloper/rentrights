import { describe, it, expect } from 'vitest';
import { stalenessFor } from '@/lib/legal/staleness';
import { DatedValue } from '@/lib/legal/select';

const items: DatedValue<number | null>[] = [
  { value: 3, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LAHD', expectedUpdate: '2026-07-01' },
  { value: null, effectiveFrom: '2026-07-01', source: 'LAHD', expectedUpdate: '2026-07-01' },
];

describe('stalenessFor', () => {
  it('is not stale inside an active period before its expected update', () => {
    expect(stalenessFor(items, new Date('2026-06-02')).stale).toBe(false);
  });

  it('flags a pending (null-value) period', () => {
    const s = stalenessFor(items, new Date('2026-08-01'));
    expect(s.stale).toBe(true);
    expect(s.reason).toBe('pending publication');
    expect(s.expectedUpdate).toBe('2026-07-01');
  });

  it('flags past-expected-update when the value is concrete but overdue', () => {
    const overdue: DatedValue<number>[] = [
      { value: 8, effectiveFrom: '2025-08-01', effectiveTo: '2026-12-31', source: 'x', expectedUpdate: '2026-08-01' },
    ];
    const s = stalenessFor(overdue, new Date('2026-09-01'));
    expect(s.stale).toBe(true);
    expect(s.reason).toBe('past expected update');
  });

  it('flags no-current-value when no period covers the date', () => {
    const s = stalenessFor(items, new Date('2020-01-01'));
    expect(s.stale).toBe(true);
    expect(s.reason).toBe('no current value');
  });
});
