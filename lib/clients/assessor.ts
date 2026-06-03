import { ParcelFacts } from '@/lib/rules/types';

type FetchLike = (url: string) => Promise<Response>;

const PAIS = 'https://assessor.gis.lacounty.gov/assessor/rest/services/PAIS/pais_parcels/MapServer/0/query';
const ROLLS =
  'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Parcel_Data_2021_Table/FeatureServer/0/query';
const LATEST_ROLL_YEAR = '2025';

const EMPTY: ParcelFacts = { yearBuilt: null, units: null, useCode: null };

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface FeatureCollection {
  features?: Array<{ attributes?: Record<string, unknown> }>;
}

export function parseParcelFacts(json: unknown): ParcelFacts {
  const a = (json as FeatureCollection)?.features?.[0]?.attributes;
  if (!a) return { ...EMPTY };
  return {
    yearBuilt: toNum(a.YearBuilt),
    units: toNum(a.Units),
    useCode: a.UseCode != null ? String(a.UseCode) : null,
  };
}

// A one-line address ("1411 MURRAY DR, LOS ANGELES, CA, 90026") splits into the
// situs line (matched against the Assessor's SAADDR) and the city (verified
// against SAADDR2 so we never accept a same-named street in another city).
export function parseSitus(canonicalAddress: string): { situs: string; city: string } {
  const parts = canonicalAddress.split(',').map((s) => s.trim());
  return { situs: (parts[0] ?? '').toUpperCase(), city: (parts[1] ?? '').toUpperCase() };
}

/**
 * Picks the parcel AIN ONLY when there is exactly one confident match: a parcel
 * in the expected city. Returns null when the situs is absent (postal address
 * with no Assessor record, e.g. a large new building) or ambiguous (one situs
 * mapped to several parcels). Failing loud here is deliberate — the caller then
 * asks the renter to confirm, rather than showing facts for the wrong parcel.
 */
export function selectAin(json: unknown, city: string): string | null {
  const feats = (json as FeatureCollection)?.features ?? [];
  const cityUp = city.trim().toUpperCase();
  const matched = feats.filter((f) => {
    const a = f.attributes ?? {};
    if (a.AIN == null) return false;
    if (!cityUp) return true;
    return String(a.SAADDR2 ?? '')
      .toUpperCase()
      .startsWith(cityUp);
  });
  const ains = [...new Set(matched.map((f) => String(f.attributes!.AIN)))];
  return ains.length === 1 ? ains[0] : null;
}

export async function fetchParcel(
  canonicalAddress: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ain: string | null; facts: ParcelFacts }> {
  const { situs, city } = parseSitus(canonicalAddress);
  if (!situs) return { ain: null, facts: { ...EMPTY } };

  const paisWhere = encodeURIComponent(`SAADDR='${situs.replace(/'/g, "''")}'`);
  const paisRes = await fetchImpl(
    `${PAIS}?where=${paisWhere}&outFields=AIN,SAADDR,SAADDR2&returnGeometry=false&f=json`,
  );
  if (!paisRes.ok) throw new Error(`Assessor PAIS error: ${paisRes.status}`);
  const ain = selectAin(await paisRes.json(), city);
  if (!ain) return { ain: null, facts: { ...EMPTY } };

  const rollWhere = encodeURIComponent(`AIN='${ain}' AND RollYear='${LATEST_ROLL_YEAR}'`);
  const rollRes = await fetchImpl(
    `${ROLLS}?where=${rollWhere}&outFields=AIN,YearBuilt,Units,UseCode&returnGeometry=false&f=json`,
  );
  if (!rollRes.ok) throw new Error(`Assessor Rolls error: ${rollRes.status}`);
  return { ain, facts: parseParcelFacts(await rollRes.json()) };
}
