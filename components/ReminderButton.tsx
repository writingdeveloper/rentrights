'use client';
import { Regime } from '@/lib/rules/types';
import { upcomingCapChange } from '@/lib/content/rights';
import { buildReminderIcs, toIcsUtc } from '@/lib/share/reminderIcs';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { formatDate } from '@/lib/format/date';
import { Icon } from '@/components/Icon';

const SITE = 'https://rentrights.writingdeveloper.blog';

/**
 * When the regime has an upcoming pending cap change (e.g. RSO/County on 2026-07-01),
 * offers a one-tap calendar reminder to re-check — built as a client-side .ics with
 * NO PII and nothing stored (the privacy-safe alternative to a "notify me" signup).
 * Renders nothing when there is no upcoming change.
 */
export function ReminderButton({ regime, now = new Date() }: { regime: Regime; now?: Date }) {
  const t = useT();
  const { locale } = useLocale();
  const change = upcomingCapChange(regime, now);
  if (!change) return null;
  const reminderDate = change.date;
  const dateLabel = formatDate(reminderDate, locale);

  function download() {
    const ics = buildReminderIcs({
      summary: t('reminder.summary'),
      description: t('reminder.description', { date: dateLabel }),
      date: reminderDate,
      url: SITE,
      uid: `rentrights-capchange-${reminderDate}@rentrights.writingdeveloper.blog`,
      dtstamp: toIcsUtc(now),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rentrights-reminder.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
    >
      <Icon name="calendar-clock" size={16} aria-hidden="true" />
      {t('reminder.button')}
    </button>
  );
}
