import { stripUnit } from './address';

type FetchLike = (url: string) => Promise<Response>;

// LA County's official Countywide Address Management System (CAMS) locator.
// Unlike the Census geocoder (which interpolates points on street centerlines),
// CAMS returns a rooftop/parcel-accurate point, so a point-in-polygon query
// against the Assessor parcels reliably lands on the correct parcel.
const BASE = 'https://geocode.gis.lacounty.gov/geocode/rest/services/CAMS_Locator/GeocodeServer';

// Exact CAMS matches score 100; a substituted direction/street (e.g. "E 7th" →
// "W 7th") drops to ~91, and a neighbor to ~79. Require a near-exact match so we
// never trust a point CAMS had to "correct" onto a different parcel — when in
// doubt we fail loud and ask the renter instead of showing the wrong building.
export const CAMS_MIN_SCORE = 95;

export interface CamsPoint {
  x: number;
  y: number;
  /** Spatial reference (wkid) the x/y are expressed in — passed through to the parcel query. */
  wkid: number;
  score: number;
  matchAddr: string;
}

export function parseCamsPoint(json: unknown, minScore: number = CAMS_MIN_SCORE): CamsPoint | null {
  const j = json as {
    spatialReference?: { wkid?: number };
    candidates?: Array<{ address?: string; score?: number; location?: { x?: number; y?: number } }>;
  };
  const wkid = j?.spatialReference?.wkid;
  const c = j?.candidates?.[0]; // ArcGIS returns candidates ordered by score, best first.
  if (!c || wkid == null || c.location?.x == null || c.location?.y == null) return null;
  if ((c.score ?? 0) < minScore) return null;
  return { x: c.location.x, y: c.location.y, wkid, score: c.score ?? 0, matchAddr: c.address ?? '' };
}

export async function fetchCamsPoint(address: string, fetchImpl: FetchLike = fetch): Promise<CamsPoint | null> {
  const url = `${BASE}/findAddressCandidates?SingleLine=${encodeURIComponent(stripUnit(address))}&maxLocations=1&f=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`CAMS locator error: ${res.status}`);
  return parseCamsPoint(await res.json());
}
