import { DatedValue, selectDated } from './select';

export interface Staleness {
  stale: boolean;
  expectedUpdate?: string;
  reason?: 'pending publication' | 'past expected update' | 'no current value';
}

export function stalenessFor<T>(items: DatedValue<T>[], onDate: Date): Staleness {
  const p = selectDated(items, onDate);
  if (!p) return { stale: true, reason: 'no current value' };
  if (p.value == null) return { stale: true, expectedUpdate: p.expectedUpdate, reason: 'pending publication' };
  const d = onDate.toISOString().slice(0, 10);
  if (p.expectedUpdate && d > p.expectedUpdate) {
    return { stale: true, expectedUpdate: p.expectedUpdate, reason: 'past expected update' };
  }
  return { stale: false };
}
