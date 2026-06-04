'use client';
import { useState } from 'react';
import { Regime } from '@/lib/rules/types';
import { checkIncrease } from '@/lib/rules/increase';
import { useT } from '@/lib/i18n/LocaleProvider';

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function IncreaseChecker({ regime }: { regime: Regime }) {
  const t = useT();
  const isCounty = regime === 'COUNTY_RSTPO' || regime === 'COUNTY_JCO';
  const agency = t(isCounty ? 'staleness.authority.dcba' : 'staleness.authority.lahd');
  const [current, setCurrent] = useState('');
  const [proposed, setProposed] = useState('');

  if (regime === 'OUT_OF_JURISDICTION' || regime === 'UNKNOWN') return null;

  if (regime === 'JCO_ONLY' || regime === 'COUNTY_JCO') {
    return (
      <section className="mt-6">
        <h2 className="text-sm font-semibold">{t('increase.heading')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('increase.noCap')}</p>
      </section>
    );
  }

  const r = checkIncrease({ regime, currentRent: parseFloat(current), proposedRent: parseFloat(proposed) });

  let tone: 'ok' | 'bad' | 'warn' | null = null;
  let text: string | null = null;
  switch (r.verdict) {
    case 'WITHIN_CAP':
      tone = 'ok';
      text = t('increase.verdict.withinCap', { max: money(r.allowedMaxRent!), pct: r.capPct! });
      break;
    case 'OVER_CAP':
      tone = 'bad';
      text = t('increase.verdict.overCap', { max: money(r.allowedMaxRent!), pct: r.capPct! });
      break;
    case 'WITHIN_RANGE':
      tone = 'ok';
      text = t('increase.verdict.withinRange', { floorMax: money(r.allowedMaxAtFloor!), ceilingMax: money(r.allowedMaxAtCeiling!) });
      break;
    case 'OVER_RANGE':
      tone = 'bad';
      text = t('increase.verdict.overRange', { ceilingMax: money(r.allowedMaxAtCeiling!) });
      break;
    case 'UNCERTAIN_RANGE':
      tone = 'warn';
      text = t('increase.verdict.uncertainRange', { floorMax: money(r.allowedMaxAtFloor!), ceilingMax: money(r.allowedMaxAtCeiling!) });
      break;
    default:
      tone = null; // NEEDS_INPUT / NOT_APPLICABLE → show nothing
  }

  const toneClass = tone === 'bad' ? 'text-danger' : tone === 'warn' ? 'text-warning' : 'text-success';

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">{t('increase.heading')}</h2>
      <div className="mt-2 flex gap-2">
        <label className="flex-1 text-xs text-muted-foreground">
          {t('increase.currentLabel')}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={t('increase.currentPlaceholder')}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex-1 text-xs text-muted-foreground">
          {t('increase.proposedLabel')}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={proposed}
            onChange={(e) => setProposed(e.target.value)}
            placeholder={t('increase.proposedPlaceholder')}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
      </div>
      {text && <p className={`mt-2 text-sm font-semibold ${toneClass}`}>{text}</p>}
      {text && <p className="mt-1 text-xs text-muted-foreground">{t('increase.caveat', { agency })}</p>}
    </section>
  );
}
