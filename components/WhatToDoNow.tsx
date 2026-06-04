'use client';
import { Regime } from '@/lib/rules/types';
import { useT } from '@/lib/i18n/LocaleProvider';
import { cityAuthority, countyAuthority } from '@/lib/content/help';

export function WhatToDoNow({ regime }: { regime: Regime }) {
  const t = useT();
  const isCounty = regime === 'COUNTY_RSTPO' || regime === 'COUNTY_JCO';
  const auth = isCounty ? countyAuthority : cityAuthority;
  const agency = isCounty ? t('staleness.authority.dcba') : t('staleness.authority.lahd');
  return (
    <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">{t('whatToDo.heading')}</p>
      <ol className="mt-1 list-decimal pl-5 text-sm text-amber-900">
        <li>{t('whatToDo.step1')}</li>
        <li>{t('whatToDo.step2', { agency, phone: auth.phone ?? '' })}</li>
        <li>{t('whatToDo.step3')}</li>
      </ol>
    </section>
  );
}
