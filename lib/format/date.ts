/**
 * Locale-aware date formatter for user-facing date strings.
 *
 * Parses YYYY-MM-DD as UTC (appending T00:00:00Z) so the displayed day always
 * equals the literal date string regardless of the visitor's timezone.
 *
 * EN: "June 12, 2026"
 * ES: "12 de junio de 2026"
 */
export function formatDate(iso: string, locale: 'en' | 'es'): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? '';
  const date = new Date(`${iso}T00:00:00Z`);
  if (isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
