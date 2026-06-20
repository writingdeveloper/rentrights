'use client';
import { ReasonItem } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';

export function RecordsDetails({ reasons }: { reasons: ReasonItem[] }) {
  const t = useT();
  if (reasons.length === 0) return null;
  return (
    <details className="mt-4 rounded-xl border border-border p-3">
      <summary className="cursor-pointer text-sm text-muted-foreground">{t('result.detailsToggle')}</summary>
      <ul className="mt-2 list-disc pl-5 text-sm text-foreground">
        {reasons.map((r, i) => (
          <li key={i}>{t(`reason.${r.code}`, r.params)}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">{t('records.aiNote')}</p>
    </details>
  );
}
