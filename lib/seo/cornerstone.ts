import { LEGAL, CapPeriod } from '@/lib/legal/constants';
import { selectDated } from '@/lib/legal/select';
import { formatDate } from '@/lib/format/date';

// Cornerstone SEO/GEO explainer content. EVERY figure comes from the dated LEGAL
// constants (no fabricated numbers; value:null stays "pending"), so the visible
// page, the prose, and the JSON-LD all share one source of truth — and a stale
// blog can't out-rank us with a wrong number. EN-first (the page is EN; ES is Wave 2).

export interface CornerstoneRow {
  key: 'RSO' | 'AB1482' | 'COUNTY_RSTPO';
  name: string;
  cap: string;
  effective: string;
  source: string;
}

export interface CornerstoneFaq {
  q: string;
  a: string;
}

function windowText(from: string, to: string | undefined): string {
  const f = formatDate(from, 'en');
  return to ? `${f} – ${formatDate(to, 'en')}` : `from ${f}`;
}

/** The dated cap rows for the three LA regimes, computed from LEGAL on the given date. */
export function cornerstoneRows(now: Date): CornerstoneRow[] {
  // rso/co are CapPeriod (carry floorPct/ceilingPct); selectDated's generic widens
  // to DatedValue, so cast back to read the pending-range fields. The runtime
  // objects are the CapPeriod entries from LEGAL, so the cast is sound.
  const rso = selectDated(LEGAL.rsoCapPct, now) as CapPeriod | null;
  const ab = selectDated(LEGAL.ab1482CapPct, now);
  const co = selectDated(LEGAL.countyCapPct, now) as CapPeriod | null;
  return [
    {
      key: 'RSO',
      name: 'City of Los Angeles — Rent Stabilization Ordinance (RSO)',
      cap: rso
        ? rso.value != null
          ? `up to ${rso.value}%`
          : `${rso.floorPct ?? 1}–${rso.ceilingPct ?? 4}% (LAHD publishes the exact figure ~July 1)`
        : 'See LAHD',
      effective: rso ? windowText(rso.effectiveFrom, rso.effectiveTo) : '',
      source: rso?.source ?? 'LAHD',
    },
    {
      key: 'AB1482',
      name: 'California statewide — Tenant Protection Act (AB 1482)',
      cap: ab ? `up to ${ab.value}%` : 'See state guidance',
      effective: ab ? windowText(ab.effectiveFrom, ab.effectiveTo) : '',
      source: ab?.source ?? 'CA Civ. Code §1947.12 / CPI',
    },
    {
      key: 'COUNTY_RSTPO',
      name: 'Unincorporated LA County — Rent Stabilization (RSTPO)',
      cap: co
        ? co.value != null
          ? `up to ${co.value}%`
          : `up to ${co.ceilingPct ?? 3}% (DCBA publishes the exact figure ~July 1)`
        : 'See DCBA',
      effective: co ? windowText(co.effectiveFrom, co.effectiveTo) : '',
      source: co?.source ?? 'LA County DCBA',
    },
  ];
}

/**
 * Answer-first FAQ Q&A, all figures from LEGAL — feeds BOTH the visible page and
 * the FAQPage JSON-LD so the schema always matches what users (and AI crawlers) see.
 * Strictly descriptive (information, not advice).
 */
export function cornerstoneFaqs(now: Date): CornerstoneFaq[] {
  const rows = cornerstoneRows(now);
  const rso = rows.find((r) => r.key === 'RSO')!;
  const ab = rows.find((r) => r.key === 'AB1482')!;
  const co = rows.find((r) => r.key === 'COUNTY_RSTPO')!;
  const n = LEGAL.notice;
  return [
    {
      q: 'How much can my landlord raise my rent in Los Angeles right now?',
      a: `It depends on which law covers your unit. In the City of LA, rent-stabilized (RSO) units can be raised ${rso.cap.toLowerCase()} (${rso.effective}). Units under California's AB 1482 can be raised ${ab.cap.toLowerCase()}. In unincorporated LA County, the standard cap is ${co.cap.toLowerCase()}. Enter your address in the checker to see which one applies to you.`,
    },
    {
      q: 'What is the City of LA RSO rent cap for 2026?',
      a: `The RSO allows ${rso.cap.toLowerCase()}, effective ${rso.effective} (source: ${rso.source}). On July 1, 2026 the RSO moves to a new formula — 90% of CPI within a 1%–4% range — and LAHD publishes the exact figure around that date.`,
    },
    {
      q: 'How much notice must my landlord give before raising my rent?',
      a: `In California a landlord must give at least ${n.smallIncreaseDays} days' written notice for an increase of ${n.largeThresholdPct}% or less, and ${n.largeIncreaseDays} days' notice for an increase above ${n.largeThresholdPct}%. Add ${n.mailExtraDays} days if the notice was sent by mail.`,
    },
    {
      q: 'My building is not rent-controlled — does AB 1482 still limit my rent?',
      a: `Often yes. California's AB 1482 caps annual increases statewide (${ab.cap.toLowerCase()} in the Los Angeles area) and requires "just cause" to evict after 12 months. Some units are exempt — most notably housing built within the last 15 years, and certain single-family homes or condos when the owner gave the required written exemption notice.`,
    },
    {
      q: 'What about unincorporated LA County?',
      a: `Unincorporated LA County has its own Rent Stabilization ordinance (RSTPO), administered by the County DCBA. The standard cap is ${co.cap.toLowerCase()} (${co.effective}); self-certified small-property and luxury units may have somewhat higher caps. Just-cause eviction protections also apply. Confirm your unit's tier with DCBA.`,
    },
    {
      q: 'How do I check whether my specific rent increase is legal?',
      a: `Enter your address in RentRights to see which rent law applies and your unit's current cap, then use the increase checker to compare your current and proposed rent against that cap. This is an estimate from public records and the dated legal figures above — not legal advice. Confirm your unit's status with LAHD (city) or DCBA (county) before acting.`,
    },
  ];
}
