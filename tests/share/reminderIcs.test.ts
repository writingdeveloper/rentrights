import { describe, it, expect } from 'vitest';
import { buildReminderIcs, escapeIcsText, toIcsUtc } from '@/lib/share/reminderIcs';

describe('buildReminderIcs', () => {
  const ics = buildReminderIcs({
    summary: 'Re-check my LA rent cap',
    description: 'Your cap may have changed.',
    date: '2026-07-01',
    url: 'https://rentrights.writingdeveloper.blog',
    uid: 'rentrights-capchange-2026-07-01@rentrights.writingdeveloper.blog',
    dtstamp: '20260623T223000Z',
  });

  it('is a valid VCALENDAR/VEVENT with required fields', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('UID:rentrights-capchange-2026-07-01@rentrights.writingdeveloper.blog');
    expect(ics).toContain('DTSTAMP:20260623T223000Z');
  });

  it('encodes the reminder date as an all-day DTSTART', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260701');
  });

  it('uses CRLF line endings (RFC 5545)', () => {
    expect(ics).toContain('\r\n');
    expect(ics).not.toMatch(/[^\r]\n/); // every \n is preceded by \r
  });

  it('includes the URL in both URL and DESCRIPTION', () => {
    expect(ics).toContain('URL:https://rentrights.writingdeveloper.blog');
    expect(ics).toContain('rentrights.writingdeveloper.blog');
  });
});

describe('escapeIcsText', () => {
  it('escapes commas, semicolons, backslashes, and newlines', () => {
    expect(escapeIcsText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne');
  });
});

describe('toIcsUtc', () => {
  it('formats a Date as YYYYMMDDTHHMMSSZ', () => {
    expect(toIcsUtc(new Date('2026-06-23T22:30:00.000Z'))).toBe('20260623T223000Z');
  });
});
