import { Jurisdiction } from '@/lib/rules/types';

type FetchLike = (url: string) => Promise<Response>;

const BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

export function parseJurisdiction(json: unknown): Jurisdiction | null {
  const j = json as {
    result?: { addressMatches?: Array<{ geographies?: Record<string, Array<{ NAME?: string }>> }> };
  };
  const match = j?.result?.addressMatches?.[0];
  if (!match) return null;
  const place = match.geographies?.['Incorporated Places']?.[0];
  const placeName = place?.NAME ?? null;
  return {
    inLACity: placeName === 'Los Angeles city',
    placeName,
    incorporated: Boolean(placeName),
  };
}

export async function fetchJurisdiction(address: string, fetchImpl: FetchLike = fetch): Promise<Jurisdiction | null> {
  const url =
    `${BASE}?address=${encodeURIComponent(address)}` +
    `&benchmark=Public_AR_Current&vintage=Current_Current&layers=27&format=json`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Census geocoder error: ${res.status}`);
  return parseJurisdiction(await res.json());
}
