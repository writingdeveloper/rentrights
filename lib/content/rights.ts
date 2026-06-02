import { LEGAL } from '@/lib/legal/constants';
import { Regime } from '@/lib/rules/types';
import { stalenessFor, Staleness } from '@/lib/legal/staleness';

export function capLabel(regime: Regime, onDate = new Date()): string {
  const d = onDate.toISOString().slice(0, 10);
  if (regime === 'RSO') {
    const p = LEGAL.rsoCapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    if (!p) return 'See LAHD';
    return p.value != null ? `up to ${p.value}%` : `${p.floorPct}–${p.ceilingPct}% (LAHD publishes the exact figure)`;
  }
  if (regime === 'AB1482') {
    const p = LEGAL.ab1482CapPct.find((x) => x.effectiveFrom <= d && (!x.effectiveTo || d <= x.effectiveTo));
    return p ? `up to ${p.value}%` : 'See state guidance';
  }
  return 'No state/local rent cap — but Just Cause protections apply';
}

export const RIGHTS_TEXT: Record<Regime, { title: string; points: string[] }> = {
  RSO: {
    title: 'Rent Stabilization Ordinance (likely)',
    points: [
      'Your landlord generally needs a "just cause" to evict you.',
      'Rent may be increased only once every 12 months.',
      'You may be owed relocation assistance for certain no-fault evictions.',
      'Rent-increase notice: 30 days (≤10%) or 90 days (>10%).',
    ],
  },
  AB1482: {
    title: 'California Tenant Protection Act (AB 1482) (likely)',
    points: [
      'Statewide cap on annual rent increases.',
      'Just-cause eviction protections after 12 months of tenancy.',
      'One month of relocation assistance for no-fault evictions.',
      'Rent-increase notice: 30 days (≤10%) or 90 days (>10%).',
    ],
  },
  JCO_ONLY: {
    title: 'LA Just Cause Ordinance (citywide)',
    points: [
      'Even without a rent cap, your landlord generally needs a "just cause" to evict you (after 6 months).',
      'Rent-increase notice: 30 days (≤10%) or 90 days (>10%).',
      'Confirm whether AB 1482 also caps your rent — see below.',
    ],
  },
  OUT_OF_JURISDICTION: { title: 'Outside the City of Los Angeles', points: ['This tool currently covers the City of LA only. Your city or unincorporated LA County may have its own rules.'] },
  UNKNOWN: { title: 'We need a little more info', points: ['Answer the questions below so we can estimate your rights.'] },
};

export function capStaleness(regime: Regime, onDate = new Date()): Staleness | null {
  if (regime === 'RSO') return stalenessFor(LEGAL.rsoCapPct, onDate);
  if (regime === 'AB1482') return stalenessFor(LEGAL.ab1482CapPct, onDate);
  return null;
}

export function stalenessMessage(s: Staleness): string {
  const when = s.expectedUpdate ? ` around ${s.expectedUpdate}` : '';
  if (s.reason === 'pending publication') {
    return `This figure is pending LAHD publication${when}. Confirm the latest with LAHD.`;
  }
  if (s.reason === 'past expected update') {
    return `This figure was due to update${when}. Confirm the latest with LAHD.`;
  }
  return 'This figure may be out of date. Confirm the latest with LAHD.';
}
