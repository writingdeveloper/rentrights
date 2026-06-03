// Secondary unit / apartment designators. Rent regime is determined at the
// parcel level, not the unit, so these add nothing to a lookup — and the Census
// geocoder is more likely to match a one-line address without them. Stripping
// keeps "300 S Santa Fe Ave Apt 450" geocodable while preserving the city/state.
const UNIT_WORD =
  '(?:apt|apartment|unit|ste|suite|fl|floor|rm|room|bldg|building|trlr|lot|spc|space|dept|no)';

// A whole comma segment that is *only* a unit, e.g. "Apt 450" in
// "300 S Santa Fe Ave, Apt 450, Los Angeles".
const UNIT_SEGMENT = new RegExp(`^(?:#\\s*[A-Za-z0-9-]+|${UNIT_WORD}\\.?\\s*#?\\s*[A-Za-z0-9-]+)$`, 'i');

// A unit at the end of the street segment, e.g. "… Ave Apt 450" or "… Dr #5".
const TRAILING_UNIT = new RegExp(`\\s+(?:#\\s*[A-Za-z0-9-]+|${UNIT_WORD}\\.?\\s*#?\\s*[A-Za-z0-9-]+)$`, 'i');

/**
 * Removes apartment/unit/suite designators from a one-line address while
 * keeping the street, city, state, and ZIP. Safe to call on any input — an
 * address with no unit is returned unchanged (aside from trimming).
 */
export function stripUnit(address: string): string {
  const kept = address
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !UNIT_SEGMENT.test(s));
  if (kept.length > 0) kept[0] = kept[0].replace(TRAILING_UNIT, '').trim();
  return kept.join(', ');
}
