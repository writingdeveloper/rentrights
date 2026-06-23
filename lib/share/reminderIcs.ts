// Builds an iCalendar (.ics) reminder entirely client-side — no server, no account,
// no PII — so a renter can be reminded to re-check their cap (e.g. after the
// 2026-07-01 RSO transition) without us storing anything. Privacy-safe alternative
// to a "notify me" email capture, which would break the cookieless "nothing saved" promise.

export interface IcsReminder {
  summary: string;
  description: string;
  date: string; // 'YYYY-MM-DD' — all-day reminder date
  url: string;
  uid: string; // stable id, e.g. rentrights-capchange-2026-07-01@...
  dtstamp: string; // ICS UTC timestamp, e.g. 20260623T223000Z
}

/** RFC 5545 text escaping for SUMMARY/DESCRIPTION values. */
export function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** A minimal, valid all-day VEVENT calendar. Lines are CRLF-joined per spec. */
export function buildReminderIcs(r: IcsReminder): string {
  const dt = r.date.replace(/-/g, ''); // 2026-07-01 -> 20260701
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RentRights//Rent-cap reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${r.uid}`,
    `DTSTAMP:${r.dtstamp}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${escapeIcsText(r.summary)}`,
    `DESCRIPTION:${escapeIcsText(`${r.description} ${r.url}`)}`,
    `URL:${r.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Format a Date as an ICS UTC timestamp (YYYYMMDDTHHMMSSZ). */
export function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/\.\d{3}/, '').replace(/[-:]/g, '');
}
