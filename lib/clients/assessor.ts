import { ParcelFacts } from '@/lib/rules/types';

type FetchLike = (url: string) => Promise<Response>;

const PAIS = 'https://assessor.gis.lacounty.gov/assessor/rest/services/PAIS/pais_parcels/MapServer/0/query';
const ROLLS =
  'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Parcel_Data_2021_Table/FeatureServer/0/query';
const LATEST_ROLL_YEAR = '2025';

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface FeatureCollection {
  features?: Array<{ attributes?: Record<string, unknown> }>;
}

export function parseAin(json: unknown): string | null {
  const attrs = (json as FeatureCollection)?.features?.[0]?.attributes;
  const ain = attrs?.AIN;
  return ain != null ? String(ain) : null;
}

export function parseParcelFacts(json: unknown): ParcelFacts {
  const a = (json as FeatureCollection)?.features?.[0]?.attributes;
  if (!a) return { yearBuilt: null, units: null, useCode: null };
  return {
    yearBuilt: toNum(a.YearBuilt),
    units: toNum(a.Units),
    useCode: a.UseCode != null ? String(a.UseCode) : null,
  };
}

// Split a one-line address into a house number + a street fragment for PAIS matching.
function splitAddress(address: string): { num: string; street: string } {
  const m = address.trim().match(/^(\d+)\s+(.+?)(?:,|$)/);
  if (!m) return { num: '', street: address.toUpperCase() };
  const street = m[2]
    .replace(/^\s*(N|S|E|W)\b\.?\s+/i, '') // drop a leading direction
    .split(/\s+/)[0]; // first significant token (e.g. "MURRAY")
  return { num: m[1], street: street.toUpperCase() };
}

export async function fetchParcel(
  address: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ain: string | null; facts: ParcelFacts }> {
  const { num, street } = splitAddress(address);
  const paisWhere = encodeURIComponent(`SANUM='${num}' AND SASTR like '%${street}%'`);
  const paisRes = await fetchImpl(`${PAIS}?where=${paisWhere}&outFields=AIN,SAADDR,SAADDR2&returnGeometry=false&f=json`);
  if (!paisRes.ok) throw new Error(`Assessor PAIS error: ${paisRes.status}`);
  const ain = parseAin(await paisRes.json());
  if (!ain) return { ain: null, facts: { yearBuilt: null, units: null, useCode: null } };

  const rollWhere = encodeURIComponent(`AIN='${ain}' AND RollYear='${LATEST_ROLL_YEAR}'`);
  const rollRes = await fetchImpl(
    `${ROLLS}?where=${rollWhere}&outFields=AIN,YearBuilt,Units,UseCode&returnGeometry=false&f=json`,
  );
  if (!rollRes.ok) throw new Error(`Assessor Rolls error: ${rollRes.status}`);
  return { ain, facts: parseParcelFacts(await rollRes.json()) };
}
