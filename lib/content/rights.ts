import { LEGAL } from '@/lib/legal/constants';
import { Regime } from '@/lib/rules/types';
import { stalenessFor, Staleness } from '@/lib/legal/staleness';
import { selectDated, DatedValue } from '@/lib/legal/select';
import { formatDate } from '@/lib/format/date';

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
    if (!p) return t('result.capSeeDcba');
    return p.value != null
      ? t('result.capUpTo', { pct: p.value })
      : t('result.capCountyPending', { ceiling: p.ceilingPct ?? 3 });
  }
  return t('result.capNone');
}

const RIGHTS_POINTS: Record<Regime, number> = {
  RSO: 4, AB1482: 4, JCO_ONLY: 3, COUNTY_RSTPO: 4, COUNTY_JCO: 4, OUT_OF_JURISDICTION: 1, UNKNOWN: 1,
};

export function rightsText(regime: Regime, t: T): { title: string; points: string[] } {
  const n = RIGHTS_POINTS[regime];
  const noticeParams = {
    small: LEGAL.notice.smallIncreaseDays,
    large: LEGAL.notice.largeIncreaseDays,
    threshold: LEGAL.notice.largeThresholdPct,
    mail: LEGAL.notice.mailExtraDays,
  };
  const points: string[] = [];
  for (let i = 1; i <= n; i++) points.push(t(`rights.${regime}.point${i}`, noticeParams));
  return { title: t(`rights.${regime}.title`), points };
}

export function capStaleness(regime: Regime, onDate = new Date()): Staleness | null {
  if (regime === 'RSO') return stalenessFor(LEGAL.rsoCapPct, onDate);
  if (regime === 'AB1482') return stalenessFor(LEGAL.ab1482CapPct, onDate);
  if (regime === 'COUNTY_RSTPO') return stalenessFor(LEGAL.countyCapPct, onDate);
  return null;
}

export function stalenessMessage(s: Staleness, t: T, regime?: Regime, locale: 'en' | 'es' = 'en'): string {
  const formattedDate = s.expectedUpdate ? formatDate(s.expectedUpdate, locale) : '';
  const when = formattedDate ? t('staleness.whenSuffix', { date: formattedDate }) : '';
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

/**
 * Which i18n authority key the increase-checker caveat should point to.
 * Mirrors ResultCard.confirmLine routing so an incorporated-city renter is never
 * told to "confirm with LAHD" (LAHD administers City-of-LA rules only):
 *   incorporated city → generic "your city's office"
 *   County regimes     → DCBA
 *   otherwise (RSO/AB1482/JCO in the City of LA) → LAHD
 */
export function caveatAuthorityKey(regime: Regime, incorporatedCity = false): string {
  if (incorporatedCity) return 'staleness.authority.cityGeneric';
  if (regime === 'COUNTY_RSTPO' || regime === 'COUNTY_JCO') return 'staleness.authority.dcba';
  return 'staleness.authority.lahd';
}

/** The dated cap period in effect for the given regime on the given date (or null). */
export function capPeriodFor(regime: Regime, onDate = new Date()): DatedValue<number | null> | null {
  if (regime === 'RSO') return selectDated(LEGAL.rsoCapPct, onDate);
  if (regime === 'AB1482') return selectDated(LEGAL.ab1482CapPct, onDate);
  if (regime === 'COUNTY_RSTPO') return selectDated(LEGAL.countyCapPct, onDate);
  return null;
}

/**
 * If the regime has a *pending* (value === null, not-yet-published) cap figure
 * taking effect within the next ~90 days, return its effective date so the UI can
 * flag the upcoming change. Only RSO and County have genuinely unpublished pending
 * figures (AB 1482's next value is already known); all other regimes return null.
 */
const UPCOMING_CAP_WINDOW_DAYS = 90;
export function upcomingCapChange(regime: Regime, onDate = new Date()): { date: string } | null {
  const periods =
    regime === 'RSO' ? LEGAL.rsoCapPct : regime === 'COUNTY_RSTPO' ? LEGAL.countyCapPct : null;
  if (!periods) return null;
  const today = onDate.toISOString().slice(0, 10);
  for (const p of periods) {
    if (p.value == null && p.effectiveFrom > today) {
      const days =
        (Date.parse(p.effectiveFrom + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86_400_000;
      if (days > 0 && days <= UPCOMING_CAP_WINDOW_DAYS) return { date: p.effectiveFrom };
    }
  }
  return null;
}
