'use client';

import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { Icon } from '@/components/Icon';
import { formatDate } from '@/lib/format/date';

interface TrustChipsProps {
  date: string;
}

export function TrustChips({ date }: TrustChipsProps) {
  const t = useT();
  const { locale } = useLocale();

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground">
        <Icon name="shield-check" size={14} />
        {t('trust.records')}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground">
        <Icon name="info" size={14} />
        {t('trust.updated', { date: formatDate(date, locale) })}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground">
        <Icon name="check" size={14} />
        {t('trust.free')}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground">
        <Icon name="globe" size={14} />
        {t('trust.bilingual')}
      </span>
    </div>
  );
}
