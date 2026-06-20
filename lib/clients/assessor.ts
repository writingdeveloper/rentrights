import { ParcelFacts } from '@/lib/rules/types';
import { CamsPoint, fetchCamsPoint } from './cams';
import { timeoutFetch } from './http';

type FetchLike = (url: string) => Promise<Response>;

const PAIS = 'https://assessor.gis.lacounty.gov/assessor/rest/services/PAIS/pais_parcels/MapServer/0/query';
// NOTE: The ArcGIS FeatureServer name "Parcel_Data_2021_Table" is a static
// resource identifier assigned when the dataset was first published — it does
// NOT mean only 2021 data. The service stores ALL roll years and this code
// filters to the relevant year via the `RollYear` field in each query.
// Do NOT "fix" this to a newer year; the URL is correct as-is.
const ROLLS =
  'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Parcel_Data_2021_Table/FeatureServer/0/query';
const LATEST_ROLL_YEAR = process.env.ROLL_YEAR || '2025';

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

/** Leading house number as a positive integer, or null (fractional/ranged/missing situs). */
export function parseHouseNo(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The 5-digit ZIP embedded in a situs line like "LOS ANGELES CA 90026", or null. */
export function parseZip(v: unknown): string | null {
  const m = typeof v === 'string' ? v.match(/\b(\d{5})\b/) : null;
  return m ? m[1] : null;
}

/** Facts of the one candidate row whose AIN matches, or null if it is not in the set. */
export function selectFactsByAin(json: unknown, ain: string): ParcelFacts | null {
  const feats = (json as FeatureCollection)?.features ?? [];
  const match = feats.find((f) => f.attributes?.AIN != null && String(f.attributes.AIN) === ain);
  return match ? parseParcelFacts({ features: [match] }) : null;
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
  if (ains.length !== 1) return null;
  // Whitelist before the AIN is interpolated into the Rolls `where=` clause:
  // LA County AINs are exactly 10 digits. Reject anything else (defense-in-depth
  // against a malformed or hostile upstream PAIS response — no SQL/SOQL injection).
  return /^\d{10}$/.test(ains[0]) ? ains[0] : null;
}

/** A matched parcel: its AIN plus the situs key used for the fast roll query. */
export interface ParcelRef {
  ain: string;
  houseNo: number | null;
  zip: string | null;
}

/** Point-in-polygon: the parcel (AIN + situs) whose polygon contains this point. */
export async function parcelAtPoint(point: CamsPoint, fetchImpl: FetchLike = timeoutFetch()): Promise<ParcelRef | null> {
  const geometry = encodeURIComponent(
    JSON.stringify({ x: point.x, y: point.y, spatialReference: { wkid: point.wkid } }),
  );
  // NOTE: do not add resultRecordCount — the PAIS ArcGIS endpoint 400s on it.
  const url =
    `${PAIS}?geometry=${geometry}&geometryType=esriGeometryPoint&inSR=${point.wkid}` +
    `&spatialRel=esriSpatialRelIntersects&outFields=AIN,SANUM,SAADDR2&returnGeometry=false&f=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Assessor PAIS error: ${res.status}`);
  const json = await res.json();
  const ain = selectAin(json);
  if (!ain) return null;
  const attrs: Record<string, unknown> =
    (json as FeatureCollection).features?.find((f) => String(f.attributes?.AIN) === ain)?.attributes ?? {};
  return { ain, houseNo: parseHouseNo(attrs.SANUM), zip: parseZip(attrs.SAADDR2) };
}

export async function fetchRolls(ain: string, fetchImpl: FetchLike = timeoutFetch()): Promise<ParcelFacts> {
  const where = encodeURIComponent(`AIN='${ain}' AND RollYear='${LATEST_ROLL_YEAR}'`);
  const res = await fetchImpl(`${ROLLS}?where=${where}&outFields=AIN,YearBuilt,Units,UseCode&returnGeometry=false&f=json`);
  if (!res.ok) throw new Error(`Assessor Rolls error: ${res.status}`);
  return parseParcelFacts(await res.json());
}

/**
 * Fast path for parcel facts: query the roll table through its INDEXED situs
 * fields (`SitusZIP5` + `SitusHouseNo`) — which return in ~0.3–1.5s — then pick
 * the row whose AIN matches. (`where=AIN='…'` is unindexed upstream and scans
 * ~2.4M rows in 13–55s; see the design doc.) `zip` is a validated 5-digit string
 * and `houseNo` a number, so neither can break out of the where clause. Returns
 * null when our parcel is not in the candidate set, so the caller can fall back.
 */
export async function fetchRollsBySitus(
  ain: string,
  zip: string,
  houseNo: number,
  fetchImpl: FetchLike = timeoutFetch(),
): Promise<ParcelFacts | null> {
  const where = encodeURIComponent(
    `SitusZIP5='${zip}' AND SitusHouseNo=${houseNo} AND RollYear='${LATEST_ROLL_YEAR}'`,
  );
  const res = await fetchImpl(
    `${ROLLS}?where=${where}&outFields=AIN,YearBuilt,Units,UseCode&returnGeometry=false&resultRecordCount=50&f=json`,
  );
  if (!res.ok) throw new Error(`Assessor Rolls (situs) error: ${res.status}`);
  return selectFactsByAin(await res.json(), ain);
}

/**
 * Address → parcel facts via LA County's own stack: CAMS locator (rooftop point)
 * → PAIS parcels (point-in-polygon → AIN + situs) → assessment roll (year/units).
 * Facts come from the fast INDEXED situs query; we fall back to the AIN query when
 * situs is unavailable or our parcel is absent from the situs candidates. Returns
 * null facts at any confident-match failure instead of a wrong parcel.
 */
export async function fetchParcel(
  address: string,
  // Optional so each sub-call (CAMS / PAIS / Rolls) falls back to its own
  // timeoutFetch default; tests inject one fetch to route all of them.
  fetchImpl?: FetchLike,
): Promise<{ ain: string | null; facts: ParcelFacts }> {
  const point = await fetchCamsPoint(address, fetchImpl);
  if (!point) return { ain: null, facts: { ...EMPTY } };

  const ref = await parcelAtPoint(point, fetchImpl);
  if (!ref) return { ain: null, facts: { ...EMPTY } };

  let facts: ParcelFacts | null = null;
  if (ref.zip && ref.houseNo != null) {
    try {
      facts = await fetchRollsBySitus(ref.ain, ref.zip, ref.houseNo, fetchImpl);
    } catch {
      // AbortError (timeout) or HTTP error from the indexed situs query — fall
      // through to the AIN-indexed fallback below so the caller still gets facts.
      facts = null;
    }
  }
  if (facts == null) {
    facts = await fetchRolls(ref.ain, fetchImpl);
  }
  return { ain: ref.ain, facts };
}
