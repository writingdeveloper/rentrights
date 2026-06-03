import { describe, it, expect } from 'vitest';
import { stripUnit } from '@/lib/clients/address';

describe('stripUnit', () => {
  it('removes a trailing apartment designator with no comma', () => {
    expect(stripUnit('300 S Santa Fe Ave Apt 450')).toBe('300 S Santa Fe Ave');
  });

  it('removes the unit but keeps the city/state/zip after the comma', () => {
    expect(stripUnit('300 S Santa Fe Ave Apt 450, Los Angeles, CA 90013')).toBe(
      '300 S Santa Fe Ave, Los Angeles, CA 90013',
    );
  });

  it('handles a "#" unit marker', () => {
    expect(stripUnit('1411 Murray Dr #5, Los Angeles')).toBe('1411 Murray Dr, Los Angeles');
  });

  it('drops a unit that is its own comma segment', () => {
    expect(stripUnit('300 S Santa Fe Ave, Apt 450, Los Angeles')).toBe('300 S Santa Fe Ave, Los Angeles');
  });

  it('recognizes Unit / Ste / Suite keywords', () => {
    expect(stripUnit('123 Main St Unit B, Los Angeles')).toBe('123 Main St, Los Angeles');
    expect(stripUnit('123 Main St Ste 200, Los Angeles')).toBe('123 Main St, Los Angeles');
    expect(stripUnit('123 Main St Suite 200, Los Angeles')).toBe('123 Main St, Los Angeles');
  });

  it('leaves an address without a unit unchanged', () => {
    expect(stripUnit('1411 Murray Dr, Los Angeles, CA')).toBe('1411 Murray Dr, Los Angeles, CA');
    expect(stripUnit('300 S Santa Fe Ave')).toBe('300 S Santa Fe Ave');
  });

  it('does not mistake a numbered street for a unit', () => {
    expect(stripUnit('300 W 5th St, Los Angeles')).toBe('300 W 5th St, Los Angeles');
  });

  it('trims surrounding whitespace', () => {
    expect(stripUnit('  300 S Santa Fe Ave Apt 450  ')).toBe('300 S Santa Fe Ave');
  });
});
