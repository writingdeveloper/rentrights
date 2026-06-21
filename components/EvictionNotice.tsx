'use client';
import { LEGAL } from '@/lib/legal/constants';
import { HELP_ORGS } from '@/lib/content/help';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Icon } from '@/components/Icon';

// Emergency path for renters already served with an eviction (unlawful-detainer)
// lawsuit — a different, time-critical need from "estimate my protections".
// Collapsed by default so it's findable without alarming everyone; the deadline
// is the dated LEGAL figure (10 court days, CCP §1167 post-AB 2347) so it never
// drifts to the obsolete "5 days" still printed across the web.
//
// Stay Housed LA's phone is pulled from HELP_ORGS (single source of truth) —
// never hardcoded here so it stays in sync with verified data.
const stayHoused = HELP_ORGS.find((o) => o.name === 'Stay Housed LA')!;

export function EvictionNotice() {
  const t = useT();
  return (
    <details className="rounded-xl border border-danger bg-surface-muted p-3">
      <summary className="flex min-h-6 cursor-pointer items-center gap-2 text-sm font-semibold text-danger">
        <Icon name="alert-triangle" size={16} aria-hidden="true" />
        {t('eviction.summary')}
      </summary>
      <div className="mt-2 space-y-2 text-sm text-foreground">
        <p>{t('eviction.body', { days: LEGAL.evictionAnswerCourtDays })}</p>
        {/* Inline lifeline: Stay Housed LA phone — free, bilingual, handles evictions */}
        <p className="font-medium">
          {t('eviction.callLabel')}{' '}
          <a
            className="inline-flex items-center gap-1 text-primary underline"
            href={`tel:${stayHoused.phone!.replace(/[^0-9+]/g, '')}`}
          >
            <Icon name="phone" size={14} aria-hidden="true" />
            {stayHoused.phone}
          </a>{' '}
          <span className="font-normal text-muted-foreground">({t('eviction.stayHousedNote')})</span>
        </p>
        <p>
          <a
            className="inline-flex min-h-11 items-center text-primary underline"
            href="https://tenantpowertoolkit.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('eviction.toolkitLink')}
          </a>{' '}
          {t('eviction.legalAid')}
        </p>
      </div>
    </details>
  );
}
