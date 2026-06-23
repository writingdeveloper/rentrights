'use client';
import { useState } from 'react';
import { Regime } from '@/lib/rules/types';
import { checkIncrease } from '@/lib/rules/increase';
import { caveatAuthorityKey } from '@/lib/content/rights';
import { useT } from '@/lib/i18n/LocaleProvider';
import { Icon } from '@/components/Icon';

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function IncreaseChecker({
  regime,
  incorporatedCity = false,
  preliminary = false,
}: {
  regime: Regime;
  incorporatedCity?: boolean;
  preliminary?: boolean;
}) {
  const t = useT();
  // Route the "confirm with…" caveat to the correct authority — never LAHD for an
  // incorporated city (LAHD covers the City of LA only).
  const agency = t(caveatAuthorityKey(regime, incorporatedCity));
  const [current, setCurrent] = useState('');
  const [proposed, setProposed] = useState('');

  if (regime === 'OUT_OF_JURISDICTION' || regime === 'UNKNOWN') return null;

  if (regime === 'JCO_ONLY' || regime === 'COUNTY_JCO') {
    return (
      <section className="mt-6">
        <h2 className="text-sm font-semibold">{t('increase.noCapHeading')}</h2>
        {preliminary && <p className="mt-1 text-sm text-muted-foreground">{t('increase.preliminary')}</p>}
        <p className="mt-1 text-sm text-muted-foreground">{t('increase.noCap')}</p>
        {/* Item 8: COUNTY_JCO no-cap understates AB 1482 — strengthen disclosure. */}
        {regime === 'COUNTY_JCO' && (
          <p className="mt-2 text-sm text-muted-foreground">{t('increase.countyJcoAb1482Note')}</p>
        )}
      </section>
    );
  }

  const r = checkIncrease({ regime, currentRent: parseFloat(current), proposedRent: parseFloat(proposed) });

  let tone: 'ok' | 'bad' | 'warn' | null = null;
  let text: string | null = null;
  let shortWord: string | null = null;
  let shortIcon: 'check' | 'x' | 'alert-triangle' | null = null;

  switch (r.verdict) {
    case 'WITHIN_CAP':
      tone = 'ok';
      text = t('increase.verdict.withinCap', { max: money(r.allowedMaxRent!), pct: r.capPct! });
      shortWord = t('increase.within');
      shortIcon = 'check';
      break;
    case 'OVER_CAP':
      tone = 'bad';
      text = t('increase.verdict.overCap', { max: money(r.allowedMaxRent!), pct: r.capPct! });
      shortWord = t('increase.over');
      shortIcon = 'x';
      break;
    case 'WITHIN_RANGE':
      tone = 'ok';
      text = t('increase.verdict.withinRange', { floorMax: money(r.allowedMaxAtFloor!), ceilingMax: money(r.allowedMaxAtCeiling!) });
      shortWord = t('increase.within');
      shortIcon = 'check';
      break;
    case 'OVER_RANGE':
      tone = 'bad';
      text = t('increase.verdict.overRange', { ceilingMax: money(r.allowedMaxAtCeiling!) });
      shortWord = t('increase.over');
      shortIcon = 'alert-triangle';
      break;
    case 'UNCERTAIN_RANGE':
      tone = 'warn';
      text = t('increase.verdict.uncertainRange', { floorMax: money(r.allowedMaxAtFloor!), ceilingMax: money(r.allowedMaxAtCeiling!) });
      shortWord = t('increase.uncertain');
      shortIcon = 'alert-triangle';
      break;
    default:
      tone = null; // NEEDS_INPUT / NOT_APPLICABLE → show nothing
  }

  const toneClass = tone === 'bad' ? 'text-danger' : tone === 'warn' ? 'text-warning' : 'text-success';

  return (
    <section className="mt-6">
      {/* Elevated card */}
      <div className="rounded-lg bg-surface p-4 shadow-md sm:p-5">
        <h2 className="text-base font-semibold">{t('increase.cardTitle')}</h2>
        {preliminary && <p className="mt-1 text-sm text-muted-foreground">{t('increase.preliminary')}</p>}
        <div className="mt-3 flex gap-2">
          <label className="flex-1 text-sm text-muted-foreground">
            {t('increase.currentLabel')}
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder={t('increase.currentPlaceholder')}
              className="mt-1 min-h-11 w-full rounded-lg border border-border-input bg-surface px-3 py-2 text-base"
            />
          </label>
          <label className="flex-1 text-sm text-muted-foreground">
            {t('increase.proposedLabel')}
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder={t('increase.proposedPlaceholder')}
              className="mt-1 min-h-11 w-full rounded-lg border border-border-input bg-surface px-3 py-2 text-base"
            />
          </label>
        </div>

        {/* Empty state */}
        {tone === null && (
          <p className="mt-2 text-sm text-muted-foreground">{t('increase.empty')}</p>
        )}

        {/* Icon + short word verdict (non-color cue) */}
        {shortIcon && (
          <p className={`mt-2 flex items-center gap-1 text-sm font-bold ${toneClass}`}>
            <Icon name={shortIcon} size={16} aria-hidden="true" />
            {shortWord}
          </p>
        )}
        {/* Full detailed sentence */}
        {text && <p className={`mt-1 text-sm font-semibold ${toneClass}`}>{text}</p>}
        {text && <p className="mt-1 text-sm text-muted-foreground">{t('increase.caveat', { agency })}</p>}
        {/* Item 7: COUNTY_RSTPO OVER_CAP may be a false positive for small-property
            (2.93%) or luxury (3.93%) units whose cap is higher than the base 1.93%.
            DO NOT change the cap math — just surface a disclosure note. */}
        {regime === 'COUNTY_RSTPO' && r.verdict === 'OVER_CAP' && (
          <p className="mt-2 text-sm text-muted-foreground">{t('increase.countyTierNote')}</p>
        )}
      </div>
    </section>
  );
}
