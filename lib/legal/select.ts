export interface DatedValue<T> {
  value: T;
  effectiveFrom: string; // 'YYYY-MM-DD'
  effectiveTo?: string; // inclusive
  source: string;
  note?: string;
}

export function selectDated<T>(items: DatedValue<T>[], onDate: Date): DatedValue<T> | null {
  const d = onDate.toISOString().slice(0, 10);
  for (const it of items) {
    if (it.effectiveFrom <= d && (it.effectiveTo === undefined || d <= it.effectiveTo)) {
      return it;
    }
  }
  return null;
}
