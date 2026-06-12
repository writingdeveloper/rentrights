'use client';
import { RegimeResult } from '@/lib/rules/types';
import { rightsText, capLabel, capStaleness, stalenessMessage, notFinalBanner, isCovered } from '@/lib/content/rights';
import { useT } from '@/lib/i18n/LocaleProvider';

export function ResultCard({ result, lastVerified, now = new Date() }: { result: RegimeResult; lastVerified?: string; now?: Date }) {
  const t = useT();
  const rights = rightsText(result.regime, t);
  const detailed = result.regime !== 'OUT_OF_JURISDICTION' && result.regime !== 'UNKNOWN';
  const covered = isCovered(result.regime);
  // Freshness as a trust signal: when the figure is current we surface the
  // verification date right by the cap (our edge over stale-data competitors);
  // when it's pending/stale the amber staleness line takes that slot instead.
  const staleness = detailed ? capStaleness(result.regime, now) : null;
  // Non-color status cue (WCAG 1.4.1): icon + tinted token surface keyed by coverage.
  const icon = covered ? '✓' : 'ⓘ';
  const heroSurface = covered ? 'bg-success-soft' : 'bg-warning-soft';
  const heroAccent = covered ? 'text-success' : 'text-warning';

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
      <div className={`${heroSurface} p-5`}>
        {covered && <p className="mb-1 text-sm font-medium text-muted-foreground">{t('result.reassure')}</p>}
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className={`mt-0.5 text-2xl ${heroAccent}`}>{icon}</span>
          <div>
            <h2 className="font-serif text-2xl font-bold leading-tight">{t('result.likelyPrefix')} {rights.title}</h2>
            {detailed && (
              <>
                <span className={`mt-2 inline-block rounded-full bg-surface px-3 py-0.5 text-xs font-semibold ${heroAccent}`}>
                  {t(`result.confidence.${result.confidence}`)}
                </span>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('result.legalIncrease')}</p>
                <p className={`text-3xl font-extrabold tabular-nums ${heroAccent}`}>{capLabel(result.regime, t, now)}</p>
                {staleness?.stale ? (
                  <p className="mt-1 text-xs text-muted-foreground">⚠ {stalenessMessage(staleness, t, result.regime)}</p>
                ) : lastVerified ? (
                  <p className="mt-1 text-xs font-medium text-success">
                    <span aria-hidden="true">✓</span> {t('result.verifiedBadge', { date: lastVerified })}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="p-5">
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {rights.points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <div className="mt-4 rounded-lg border border-warning bg-warning-soft p-2 text-xs font-semibold text-warning">
          {notFinalBanner(result.regime, t, result.reasons)}
        </div>
      </div>
    </div>
  );
}
