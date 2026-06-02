import { fetchJurisdiction } from '@/lib/clients/census';
import { fetchParcel } from '@/lib/clients/assessor';
import { resolveRegime } from '@/lib/rules/engine';
import { Jurisdiction, ParcelFacts, RegimeResult, UserAnswers } from '@/lib/rules/types';
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
  dataWarnings: string[];
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
): Promise<LookupResult> {
  const jurisdiction = await deps.getJurisdiction(address);
  if (!jurisdiction) throw new AddressNotFoundError(address);

  const dataWarnings: string[] = [];
  let facts: ParcelFacts = { yearBuilt: null, units: null, useCode: null };

  if (jurisdiction.inLACity) {
    try {
      const parcel = await deps.getParcel(address);
      facts = parcel.facts;
      if (facts.yearBuilt == null || facts.units == null) {
        dataWarnings.push(
          'We could not read full property records for this address, so we will ask you a couple of questions.',
        );
      }
    } catch {
      dataWarnings.push('Property records are temporarily unavailable; answers below are based only on your responses.');
    }
  }

  const result = resolveRegime({ jurisdiction, facts, answers });
  return { address, jurisdiction, facts, result, dataWarnings, lastVerified: LEGAL.lastVerified };
}
