import { stripUnit } from './address';
import { timeoutFetch } from './http';

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

export async function fetchCamsPoint(address: string, fetchImpl: FetchLike = timeoutFetch()): Promise<CamsPoint | null> {
  const url = `${BASE}/findAddressCandidates?SingleLine=${encodeURIComponent(stripUnit(address))}&maxLocations=1&f=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`CAMS locator error: ${res.status}`);
  return parseCamsPoint(await res.json());
}

const SUGGEST_MIN = 4;
const MAX_SUGGESTIONS = 5;

/** True when a query is long enough to ask CAMS for suggestions. */
export function shouldSuggest(text: string): boolean {
  return text.trim().length >= SUGGEST_MIN;
}

export function parseSuggestions(json: unknown): string[] {
  const j = json as { suggestions?: Array<{ text?: string }>; error?: unknown } | null;
  if (!j || j.error || !Array.isArray(j.suggestions)) return [];
  return j.suggestions
    .map((s) => s.text)
    .filter((t): t is string => typeof t === 'string')
    .slice(0, MAX_SUGGESTIONS);
}

/** Autocomplete labels (full addresses incl. city) for a partial address. */
export async function fetchSuggestions(text: string, fetchImpl: FetchLike = timeoutFetch()): Promise<string[]> {
  if (!shouldSuggest(text)) return [];
  const url = `${BASE}/suggest?text=${encodeURIComponent(text.trim())}&maxSuggestions=${MAX_SUGGESTIONS}&f=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`CAMS suggest error: ${res.status}`);
  return parseSuggestions(await res.json());
}
