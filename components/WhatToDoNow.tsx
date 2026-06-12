'use client';
import { Regime, ReasonItem } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';
import { cityAuthority, countyAuthority } from '@/lib/content/help';

export function WhatToDoNow({ regime, reasons = [] }: { regime: Regime; reasons?: ReasonItem[] }) {
  const t = useT();
  // Incorporated-city AB1482 results can't name a specific agency (LAHD is LA
  // City only), so step 2 falls back to a generic "your city's office" prompt.
  const incorporated = reasons.some((r) => r.code === 'INCORPORATED_CITY');
  const isCounty = regime === 'COUNTY_RSTPO' || regime === 'COUNTY_JCO';
  const auth = isCounty ? countyAuthority : cityAuthority;
  const agency = isCounty ? t('staleness.authority.dcba') : t('staleness.authority.lahd');
  return (
    <section className="mt-4 rounded-xl border border-warning bg-warning-soft p-3">
      <h2 className="text-sm font-semibold text-warning">{t('whatToDo.heading')}</h2>
      <ol className="mt-1 list-decimal pl-5 text-sm text-warning">
        <li>{t('whatToDo.step1')}</li>
        <li>{incorporated ? t('whatToDo.step2Generic') : t('whatToDo.step2', { agency, phone: auth.phone ?? '' })}</li>
        <li>{t('whatToDo.step3')}</li>
      </ol>
    </section>
  );
}
