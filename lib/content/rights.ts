import { LEGAL } from '@/lib/legal/constants';
import { Regime } from '@/lib/rules/types';
import { stalenessFor, Staleness } from '@/lib/legal/staleness';
import { cityAuthority, countyAuthority } from '@/lib/content/help';

type T = (key: string, params?: Record<string, string | number>) => string;

// Regimes where we have an actual protection to report (vs OOJ / not-enough-info).
const COVERED_REGIMES: Regime[] = ['RSO', 'AB1482', 'JCO_ONLY', 'COUNTY_RSTPO', 'COUNTY_JCO'];
export function isCovered(regime: Regime): boolean {
  return COVERED_REGIMES.includes(regime);
}

export function capLabel(regime: Regime, t: T, onDate = new Date()): string {
  const d = onDate.toISOString().slice(0, 10);
  if (regime === 'RSO') {
    const p = LEGAL.rsoCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    if (!p) return t('result.capSeeLahd');
    return p.value != null
      ? t('result.capUpTo', { pct: p.value })
      : t('result.capRsoPending', { floor: p.floorPct ?? 1, ceiling: p.ceilingPct ?? 4 });
  }
  if (regime === 'AB1482') {
    const p = LEGAL.ab1482CapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p ? t('result.capUpTo', { pct: p.value }) : t('result.capSeeState');
  }
  if (regime === 'COUNTY_RSTPO') {
    const p = LEGAL.countyCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p ? t('result.capUpTo', { pct: p.value }) : t('result.capSeeDcba');
  }
  return t('result.capNone');
}

const RIGHTS_POINTS: Record<Regime, number> = {
  RSO: 4, AB1482: 4, JCO_ONLY: 3, COUNTY_RSTPO: 4, COUNTY_JCO: 4, OUT_OF_JURISDICTION: 1, UNKNOWN: 1,
};

export function rightsText(regime: Regime, t: T): { title: string; points: string[] } {
  const n = RIGHTS_POINTS[regime];
  const points: string[] = [];
  for (let i = 1; i <= n; i++) points.push(t(`rights.${regime}.point${i}`));
  return { title: t(`rights.${regime}.title`), points };
}

export function capStaleness(regime: Regime, onDate = new Date()): Staleness | null {
  if (regime === 'RSO') return stalenessFor(LEGAL.rsoCapPct, onDate);
  if (regime === 'AB1482') return stalenessFor(LEGAL.ab1482CapPct, onDate);
  if (regime === 'COUNTY_RSTPO') return stalenessFor(LEGAL.countyCapPct, onDate);
  return null;
}

/**
 * The "Not final — confirm with …" banner, routed to the correct enforcement
 * authority for the regime: City regimes (RSO/AB1482/JCO_ONLY) → LAHD;
 * County regimes (COUNTY_RSTPO/COUNTY_JCO) → LA County DCBA. For
 * OUT_OF_JURISDICTION / UNKNOWN we don't know the right agency, so we show a
 * generic "your local rent/housing authority" message rather than a wrong phone.
 */
export function notFinalBanner(regime: Regime, t: T): string {
  if (regime === 'COUNTY_RSTPO' || regime === 'COUNTY_JCO') {
    return t('result.notFinal', { agency: t('staleness.authority.dcba'), phone: countyAuthority.phone ?? '' });
  }
  if (regime === 'RSO' || regime === 'AB1482' || regime === 'JCO_ONLY') {
    return t('result.notFinal', { agency: t('staleness.authority.lahd'), phone: cityAuthority.phone ?? '' });
  }
  return t('result.notFinalGeneric');
}

export function stalenessMessage(s: Staleness, t: T, regime?: Regime): string {
  const when = s.expectedUpdate ? t('staleness.whenSuffix', { date: s.expectedUpdate }) : '';
  const who =
    regime === 'AB1482'
      ? t('staleness.authority.state')
      : regime === 'COUNTY_RSTPO'
        ? t('staleness.authority.dcba')
        : t('staleness.authority.lahd');
  if (s.reason === 'pending publication') return t('staleness.pending', { when, who });
  if (s.reason === 'past expected update') return t('staleness.pastUpdate', { when, who });
  return t('staleness.generic', { when, who });
}
