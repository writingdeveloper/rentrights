import { fetchJurisdiction } from '@/lib/clients/census';
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
  getJurisdiction: (address: string) => Promise<Jurisdiction | null>;
  getParcel: (address: string) => Promise<{ ain: string | null; facts: ParcelFacts }>;
}

const defaultDeps: LookupDeps = {
  getJurisdiction: (a) => fetchJurisdiction(a),
  getParcel: (a) => fetchParcel(a),
};

export async function lookup(
  address: string,
  answers: UserAnswers = {},
  deps: LookupDeps = defaultDeps,
  now: Date = new Date(),
): Promise<LookupResult> {
  const jurisdiction = await deps.getJurisdiction(address);
  if (!jurisdiction) throw new AddressNotFoundError(address);

  const dataWarnings: WarningCode[] = [];
  let facts: ParcelFacts = { yearBuilt: null, units: null, useCode: null };

  if (jurisdiction.inLACity || (jurisdiction.placeName === null && jurisdiction.inLACounty)) {
    try {
      const parcel = await deps.getParcel(address);
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
