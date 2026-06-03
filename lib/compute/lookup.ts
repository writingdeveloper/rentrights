import { fetchGeocode, GeocodeMatch } from '@/lib/clients/census';
import { fetchParcel } from '@/lib/clients/assessor';
import { resolveRegime } from '@/lib/rules/engine';
import { Jurisdiction, ParcelFacts, RegimeResult, UserAnswers, WarningCode } from '@/lib/rules/types';
import { LEGAL } from '@/lib/legal/constants';

export class AddressNotFoundError extends Error {
  constructor(address: string) {
    super(`Address not found: ${address}`);
    this.name = 'AddressNotFoundError';
  }
}

export interface LookupResult {
  address: string;
  jurisdiction: Jurisdiction;
  facts: ParcelFacts;
  result: RegimeResult;
  dataWarnings: WarningCode[];
  lastVerified: string;
}

export interface LookupDeps {
  getGeocode: (address: string) => Promise<GeocodeMatch | null>;
  getParcel: (canonicalAddress: string) => Promise<{ ain: string | null; facts: ParcelFacts }>;
}

const defaultDeps: LookupDeps = {
  getGeocode: (a) => fetchGeocode(a),
  getParcel: (a) => fetchParcel(a),
};

export async function lookup(
  address: string,
  answers: UserAnswers = {},
  deps: LookupDeps = defaultDeps,
  now: Date = new Date(),
): Promise<LookupResult> {
  const geo = await deps.getGeocode(address);
  if (!geo) throw new AddressNotFoundError(address);
  const { jurisdiction } = geo;

  const dataWarnings: WarningCode[] = [];
  let facts: ParcelFacts = { yearBuilt: null, units: null, useCode: null };

  if (jurisdiction.inLACity || (jurisdiction.placeName === null && jurisdiction.inLACounty)) {
    try {
      // Match the parcel by the geocoder's canonical address, not the raw input.
      const parcel = await deps.getParcel(geo.matchedAddress || address);
      facts = parcel.facts;
      if (facts.yearBuilt == null || facts.units == null) {
        dataWarnings.push('DATA_INCOMPLETE');
      }
    } catch {
      dataWarnings.push('RECORDS_UNAVAILABLE');
    }
  }

  const result = resolveRegime({ jurisdiction, facts, answers, now });
  return { address, jurisdiction, facts, result, dataWarnings, lastVerified: LEGAL.lastVerified };
}
