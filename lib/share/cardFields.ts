import { Regime } from '@/lib/rules/types';
import { rightsText, capLabel, isCovered } from '@/lib/content/rights';
import { formatDate } from '@/lib/format/date';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ShareCardFields {
  title: string;
  plain: string;
  cap: string | null;
  covered: boolean;
  asOf: string;
}

const DETAILED = (r: Regime) => r !== 'OUT_OF_JURISDICTION' && r !== 'UNKNOWN';

/**
 * The display fields for a shareable result card, derived for a regime on a date.
 * Reuses the same dated helpers as the live result so a saved/forwarded image
 * carries the correct, current cap and an "as of" date (never a stale-wrong number).
 */
export function shareCardFields(
  regime: Regime,
  t: T,
  lastVerified: string,
  now: Date,
  locale: 'en' | 'es',
): ShareCardFields {
  return {
    title: rightsText(regime, t).title,
    plain: DETAILED(regime) ? t(`rights.${regime}.plain`) : '',
    cap: DETAILED(regime) ? capLabel(regime, t, now) : null,
    covered: isCovered(regime),
    asOf: formatDate(lastVerified, locale),
  };
}
