import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/format/date';

describe('formatDate', () => {
  it('formats 2026-06-12 as "June 12, 2026" for EN', () => {
    expect(formatDate('2026-06-12', 'en')).toBe('June 12, 2026');
  });

  it('formats 2026-06-12 as "12 de junio de 2026" for ES', () => {
    expect(formatDate('2026-06-12', 'es')).toBe('12 de junio de 2026');
  });

  it('formats 2026-06-04 correctly for EN', () => {
    expect(formatDate('2026-06-04', 'en')).toBe('June 4, 2026');
  });

  it('formats 2026-06-04 correctly for ES', () => {
    expect(formatDate('2026-06-04', 'es')).toBe('4 de junio de 2026');
  });

  it('formats 2026-06-19 (today) correctly for EN', () => {
    expect(formatDate('2026-06-19', 'en')).toBe('June 19, 2026');
  });

  it('formats 2026-06-19 (today) correctly for ES', () => {
    expect(formatDate('2026-06-19', 'es')).toBe('19 de junio de 2026');
  });

  // TZ-stability: same day regardless of when in the day you run the test.
  it('always shows June 12, not June 11 or June 13 (UTC-pinned parse)', () => {
    // Simulates midnight UTC — worst case for timezone-naive new Date('2026-06-12').
    const result = formatDate('2026-06-12', 'en');
    expect(result).toBe('June 12, 2026');
    expect(result).not.toContain('June 11');
    expect(result).not.toContain('June 13');
  });

  it('returns empty string for empty input', () => {
    expect(formatDate('', 'en')).toBe('');
  });

  it('returns the raw value for invalid input (non-ISO)', () => {
    expect(formatDate('not-a-date', 'en')).toBe('not-a-date');
  });
});
