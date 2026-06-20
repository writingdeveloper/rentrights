'use client';
import { Regime, ReasonItem } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';
import { cityAuthority, countyAuthority } from '@/lib/content/help';
import { Icon } from '@/components/Icon';

export function WhatToDoNow({ regime, reasons = [] }: { regime: Regime; reasons?: ReasonItem[] }) {
  const t = useT();
  // Incorporated-city AB1482 results can't name a specific agency (LAHD is LA
  // City only), so step 2 falls back to a generic "your city's office" prompt.
  const incorporated = reasons.some((r) => r.code === 'INCORPORATED_CITY');
  const isCounty = regime === 'COUNTY_RSTPO' || regime === 'COUNTY_JCO';
  const auth = isCounty ? countyAuthority : cityAuthority;
  const agency = isCounty ? t('staleness.authority.dcba') : t('staleness.authority.lahd');
  return (
    <section className="mt-4 rounded-xl border border-success bg-success-soft p-3">
      <h2 className="text-sm font-semibold text-success">{t('whatToDo.heading')}</h2>
      <ol className="mt-1 space-y-1 text-sm text-foreground">
        <li className="flex items-start gap-2">
          <Icon name="arrow-right" size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {t('whatToDo.step1')}
        </li>
        <li className="flex items-start gap-2">
          <Icon name="arrow-right" size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {incorporated ? t('whatToDo.step2Generic') : t('whatToDo.step2', { agency, phone: auth.phone ?? '' })}
        </li>
        <li className="flex items-start gap-2">
          <Icon name="arrow-right" size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          {t('whatToDo.step3')}
        </li>
      </ol>
    </section>
  );
}
