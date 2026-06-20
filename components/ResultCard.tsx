'use client';
import { RegimeResult } from '@/lib/rules/types';
import { rightsText, capLabel, capStaleness, stalenessMessage, isCovered } from '@/lib/content/rights';
import { cityAuthority, countyAuthority } from '@/lib/content/help';
import { LEGAL } from '@/lib/legal/constants';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { Icon } from '@/components/Icon';
import { formatDate } from '@/lib/format/date';

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/**
 * Resolve the single numeric annual cap % for the given regime on the given date,
 * or return null if it is a range / pending / not applicable.
 * Used for the $ example line — we only show it when there is one concrete number.
 */
function singleCapPct(regime: string, onDate: Date): number | null {
  const d = onDate.toISOString().slice(0, 10);
  if (regime === 'RSO') {
    const p = LEGAL.rsoCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p?.value != null ? p.value : null;
  }
  if (regime === 'AB1482') {
    const p = LEGAL.ab1482CapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p?.value != null ? p.value : null;
  }
  if (regime === 'COUNTY_RSTPO') {
    const p = LEGAL.countyCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p?.value != null ? p.value : null;
  }
  return null;
}

/**
 * Consolidated honest confirm line — routed to the correct authority:
 *   City regimes (RSO/AB1482/JCO_ONLY) → LAHD
 *   County regimes (COUNTY_RSTPO/COUNTY_JCO) → LA County DCBA
 *   Incorporated-city / OOJ → generic "your local rent/housing authority"
 * Condenses to a single line: "Estimate from public records. Confirm free with <authority>: <phone>"
 */
function confirmLine(regime: string, t: ReturnType<typeof useT>, reasons: RegimeResult['reasons']): string {
  if (reasons.some((r) => r.code === 'INCORPORATED_CITY')) {
    return t('result.confirmLineGeneric');
  }
  if (regime === 'COUNTY_RSTPO' || regime === 'COUNTY_JCO') {
    return t('result.confirmLineCounty', { phone: countyAuthority.phone ?? '' });
  }
  if (regime === 'RSO' || regime === 'AB1482' || regime === 'JCO_ONLY') {
    return t('result.confirmLine', { phone: cityAuthority.phone ?? '' });
  }
  return t('result.confirmLineGeneric');
}

/** Choose eyebrow label based on regime coverage and confidence. */
function eyebrowKey(covered: boolean, hasQuestions: boolean, confidence: string): string {
  if (covered && !hasQuestions && confidence === 'high') return 'result.eyebrow.protected';
  if (covered) return 'result.eyebrow.likely';
  if (hasQuestions) return 'result.eyebrow.needsInfo';
  return 'result.eyebrow.notCovered';
}

export function ResultCard({ result, lastVerified, now = new Date() }: { result: RegimeResult; lastVerified?: string; now?: Date }) {
  const t = useT();
  const { locale } = useLocale();
  const rights = rightsText(result.regime, t);
  const detailed = result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN';
  const covered = isCovered(result.regime);
  const hasQuestions = result.questions.length > 0;

  // Freshness as a trust signal.
  const staleness = detailed ? capStaleness(result.regime, now) : null;

  // Status cue: color rail + icon + eyebrow (non-color-alone per WCAG 1.4.1).
  const heroSurface = covered ? 'bg-success-soft' : 'bg-warning-soft';
  const railColor = covered ? 'bg-success' : 'bg-warning';
  const heroAccent = covered ? 'text-success' : 'text-warning';
  const iconName = covered ? 'shield-check' : (hasQuestions ? 'info' : 'alert-triangle');
  const iconLabel = t(eyebrowKey(covered, hasQuestions, result.confidence));

  // $ example: only when there is a single numeric cap available.
  const capPct = detailed ? singleCapPct(result.regime, now) : null;
  const EXAMPLE_RENT = 2000;
  const exampleAmount = capPct != null ? Math.round(EXAMPLE_RENT * capPct / 100) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
      {/* Left status rail */}
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${railColor}`} aria-hidden="true" />
        <div className="flex-1">
          {/* Hero section */}
          <div className={`${heroSurface} p-5`}>
            {/* Eyebrow */}
            <p className={`mb-2 text-sm font-bold uppercase tracking-wide ${heroAccent}`}>
              <Icon name={iconName} size={16} className="mr-1 inline-block align-text-bottom" aria-hidden="true" />
              {iconLabel}
            </p>

            {covered && (
              <p className="mb-1 text-sm font-medium text-muted-foreground">{t('result.reassure')}</p>
            )}

            <div className="flex items-start gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">{rights.title}</h2>
                {detailed && (
                  <>
                    <span className={`mt-2 inline-block rounded-pill bg-surface px-3 py-0.5 text-sm font-semibold ${heroAccent}`}>
                      {t(`result.confidence.${result.confidence}`)}
                    </span>
                    <p className="mt-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">{t('result.legalIncrease')}</p>
                    <p className={`font-display text-3xl font-extrabold tabular-nums ${heroAccent}`}>{capLabel(result.regime, t, now)}</p>

                    {/* $ example line — only when a single numeric cap exists */}
                    {exampleAmount != null && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('result.capExample', {
                          rent: money(EXAMPLE_RENT),
                          amount: money(exampleAmount),
                        })}
                      </p>
                    )}

                    {/* Verified date pill or staleness warning */}
                    {staleness?.stale ? (
                      <p className="mt-1 text-sm text-muted-foreground">⚠ {stalenessMessage(staleness, t, result.regime, locale)}</p>
                    ) : lastVerified ? (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1 text-sm font-medium text-success">
                        <Icon name="shield-check" size={14} aria-hidden="true" />
                        {t('result.verifiedBadge', { date: formatDate(lastVerified, locale) })}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Rights bullets + finality line + consolidated confirm */}
          <div className="p-5">
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
              {rights.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>

            {/* Finality line */}
            {hasQuestions ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-warning">
                <Icon name="alert-triangle" size={16} aria-hidden="true" />
                {t('result.almostThere')}
              </p>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-success">
                <Icon name="check" size={16} aria-hidden="true" />
                {t('result.finalAnswer')}
              </p>
            )}

            {/* ONE consolidated honest/confirm line */}
            <div className="mt-3 rounded-lg border border-border bg-surface-muted p-2 text-sm text-muted-foreground flex items-start gap-1.5">
              <Icon name="info" size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{confirmLine(result.regime, t, result.reasons)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
