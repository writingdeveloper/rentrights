'use client';
import { LEGAL } from '@/lib/legal/constants';
import { useT } from '@/lib/i18n/LocaleProvider';

// Emergency path for renters already served with an eviction (unlawful-detainer)
// lawsuit — a different, time-critical need from "estimate my protections".
// Collapsed by default so it's findable without alarming everyone; the deadline
// is the dated LEGAL figure (10 court days, CCP §1167 post-AB 2347) so it never
// drifts to the obsolete "5 days" still printed across the web.
export function EvictionNotice() {
  const t = useT();
  return (
    <details className="rounded-xl border border-danger/40 bg-surface-muted p-3">
      <summary className="cursor-pointer text-sm font-semibold text-danger">
        {t('eviction.summary')}
      </summary>
      <div className="mt-2 space-y-2 text-sm text-foreground">
        <p>{t('eviction.body', { days: LEGAL.evictionAnswerCourtDays })}</p>
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
