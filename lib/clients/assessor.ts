import { ParcelFacts } from '@/lib/rules/types';
import { CamsPoint, fetchCamsPoint } from './cams';

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

/**
 * The AIN of the single parcel the point falls in. A confident rooftop point
 * normally intersects exactly one parcel; 0 (point in a right-of-way) or several
 * (stacked/overlapping condo parcels) returns null so the caller fails loud and
 * asks the renter to confirm rather than guessing.
 */
export function selectAin(json: unknown): string | null {
  const feats = (json as FeatureCollection)?.features ?? [];
  const ains = [...new Set(feats.filter((f) => f.attributes?.AIN != null).map((f) => String(f.attributes!.AIN)))];
  return ains.length === 1 ? ains[0] : null;
}

/** Point-in-polygon: which Assessor parcel (AIN) contains this point. */
export async function parcelAtPoint(point: CamsPoint, fetchImpl: FetchLike = fetch): Promise<string | null> {
  const geometry = encodeURIComponent(
    JSON.stringify({ x: point.x, y: point.y, spatialReference: { wkid: point.wkid } }),
  );
  // NOTE: do not add resultRecordCount — the PAIS ArcGIS endpoint 400s on it.
  const url =
    `${PAIS}?geometry=${geometry}&geometryType=esriGeometryPoint&inSR=${point.wkid}` +
    `&spatialRel=esriSpatialRelIntersects&outFields=AIN&returnGeometry=false&f=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Assessor PAIS error: ${res.status}`);
  return selectAin(await res.json());
}

export async function fetchRolls(ain: string, fetchImpl: FetchLike = fetch): Promise<ParcelFacts> {
  const where = encodeURIComponent(`AIN='${ain}' AND RollYear='${LATEST_ROLL_YEAR}'`);
  const res = await fetchImpl(`${ROLLS}?where=${where}&outFields=AIN,YearBuilt,Units,UseCode&returnGeometry=false&f=json`);
  if (!res.ok) throw new Error(`Assessor Rolls error: ${res.status}`);
  return parseParcelFacts(await res.json());
}

/**
 * Address → parcel facts via LA County's own stack: CAMS locator (rooftop point)
 * → PAIS parcels (point-in-polygon → AIN) → assessment roll (year built / units).
 * Returns null facts at any confident-match failure instead of a wrong parcel.
 */
export async function fetchParcel(
  address: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ain: string | null; facts: ParcelFacts }> {
  const point = await fetchCamsPoint(address, fetchImpl);
  if (!point) return { ain: null, facts: { ...EMPTY } };

  const ain = await parcelAtPoint(point, fetchImpl);
  if (!ain) return { ain: null, facts: { ...EMPTY } };

  return { ain, facts: await fetchRolls(ain, fetchImpl) };
}
