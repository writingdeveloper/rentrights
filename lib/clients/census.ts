import { Jurisdiction } from '@/lib/rules/types';
import { stripUnit } from './address';

type FetchLike = (url: string) => Promise<Response>;

const BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

export function parseJurisdiction(json: unknown): Jurisdiction | null {
  const j = json as {
    result?: { addressMatches?: Array<{ geographies?: Record<string, Array<{ NAME?: string; GEOID?: string }>> }> };
  };
  const match = j?.result?.addressMatches?.[0];
  if (!match) return null;
  const place = match.geographies?.['Incorporated Places']?.[0];
  const placeName = place?.NAME ?? null;
  const county = match.geographies?.['Counties']?.[0];
  const inLACounty = county
    ? county.GEOID === '06037' || county.NAME === 'Los Angeles County'
    : undefined;
  return {
    inLACity: placeName === 'Los Angeles city',
    placeName,
    incorporated: Boolean(placeName),
    inLACounty,
  };
}

export async function fetchJurisdiction(address: string, fetchImpl: FetchLike = fetch): Promise<Jurisdiction | null> {
  const url =
    `${BASE}?address=${encodeURIComponent(stripUnit(address))}` +
    `&benchmark=Public_AR_Current&vintage=Current_Current&layers=27&format=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Census geocoder error: ${res.status}`);
  return parseJurisdiction(await res.json());
}
