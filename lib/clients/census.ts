import { Jurisdiction } from '@/lib/rules/types';
import { stripUnit } from './address';

type FetchLike = (url: string) => Promise<Response>;

const BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

type GeoMatch = {
  matchedAddress?: string;
  geographies?: Record<string, Array<{ NAME?: string; GEOID?: string }>>;
};

/** The geocoder's canonical match: the jurisdiction plus the normalized address. */
export interface GeocodeMatch {
  jurisdiction: Jurisdiction;
  /** Census-normalized one-line address, e.g. "1411 MURRAY DR, LOS ANGELES, CA, 90026". */
  matchedAddress: string;
}

function jurisdictionFrom(match: GeoMatch): Jurisdiction {
  const place = match.geographies?.['Incorporated Places']?.[0];
  const placeName = place?.NAME ?? null;
  const county = match.geographies?.['Counties']?.[0];
  const inLACounty = county ? county.GEOID === '06037' || county.NAME === 'Los Angeles County' : undefined;
  return {
    inLACity: placeName === 'Los Angeles city',
    placeName,
    incorporated: Boolean(placeName),
    inLACounty,
  };
}

function firstMatch(json: unknown): GeoMatch | null {
  const j = json as { result?: { addressMatches?: GeoMatch[] } };
  return j?.result?.addressMatches?.[0] ?? null;
}

export function parseJurisdiction(json: unknown): Jurisdiction | null {
  const match = firstMatch(json);
  return match ? jurisdictionFrom(match) : null;
}

export function parseGeocode(json: unknown): GeocodeMatch | null {
  const match = firstMatch(json);
  if (!match) return null;
  return { jurisdiction: jurisdictionFrom(match), matchedAddress: match.matchedAddress ?? '' };
}

function geocodeUrl(address: string): string {
  // Strip apt/unit designators — the geocoder matches the parcel/street, not the unit.
  return (
    `${BASE}?address=${encodeURIComponent(stripUnit(address))}` +
    `&benchmark=Public_AR_Current&vintage=Current_Current&layers=27&format=json`
  );
}

/** Geocode an address to its jurisdiction + Census-normalized address (or null if unmatched). */
export async function fetchGeocode(address: string, fetchImpl: FetchLike = fetch): Promise<GeocodeMatch | null> {
  const res = await fetchImpl(geocodeUrl(address));
  if (!res.ok) throw new Error(`Census geocoder error: ${res.status}`);
  return parseGeocode(await res.json());
}

export async function fetchJurisdiction(address: string, fetchImpl: FetchLike = fetch): Promise<Jurisdiction | null> {
  const res = await fetchImpl(geocodeUrl(address));
  if (!res.ok) throw new Error(`Census geocoder error: ${res.status}`);
  return parseJurisdiction(await res.json());
}
