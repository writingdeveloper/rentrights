import { LEGAL } from '@/lib/legal/constants';
import { Confidence, Jurisdiction, ParcelFacts, QuestionId, RegimeResult, UserAnswers } from './types';

export interface ResolveInput {
  jurisdiction: Jurisdiction;
  facts: ParcelFacts;
  answers?: UserAnswers;
  now?: Date;
}

export function resolveRegime({ jurisdiction, facts, answers = {}, now = new Date() }: ResolveInput): RegimeResult {
  if (!jurisdiction.inLACity) {
    const where = jurisdiction.placeName ?? 'This address';
    return {
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [`${where} is outside the City of Los Angeles`],
      questions: [],
    };
  }

  const reasons: string[] = ['In the City of Los Angeles'];
  const questions: QuestionId[] = [];

  // --- Build era (an explicit answer overrides parcel data) ---
  let builtBefore: boolean | null;
  if (answers.builtBeforeOct1978 !== undefined) {
    builtBefore = answers.builtBeforeOct1978;
    reasons.push(builtBefore ? 'You said it was built before Oct 1, 1978' : 'You said it was built after Oct 1978');
  } else if (facts.yearBuilt == null) {
    builtBefore = null;
    questions.push('BUILT_BEFORE_OCT_1978');
  } else if (facts.yearBuilt < LEGAL.rsoBuildCutoffYear) {
    builtBefore = true;
    reasons.push(`Built in ${facts.yearBuilt} (before the Oct 1, 1978 RSO cutoff)`);
  } else if (facts.yearBuilt > LEGAL.rsoBuildCutoffYear) {
    builtBefore = false;
    reasons.push(`Built in ${facts.yearBuilt} (after the RSO cutoff)`);
  } else {
    builtBefore = null; // exactly 1978 — CO date ambiguous
    reasons.push('Built in 1978 — the exact certificate-of-occupancy date determines RSO coverage');
    questions.push('BUILT_BEFORE_OCT_1978');
  }

  // --- Unit count / single-family ---
  let multiUnit: boolean | null;
  if (answers.isSeparateHouse === true) {
    multiUnit = false;
    reasons.push('You said the other unit is a separate house (treated as single-family)');
  } else if (facts.units == null) {
    multiUnit = null;
    questions.push('IS_SEPARATE_HOUSE');
  } else if (facts.units >= 3) {
    multiUnit = true;
    reasons.push(`${facts.units} units on the parcel`);
  } else if (facts.units === 2) {
    multiUnit = true;
    reasons.push('2 units on the parcel');
    if (answers.isSeparateHouse === undefined) questions.push('IS_SEPARATE_HOUSE');
  } else {
    multiUnit = false;
    reasons.push('Single unit on the parcel (single-family)');
  }

  const conf = (): Confidence => (questions.length === 0 ? 'high' : 'medium');

  // --- Decision ---
  if (multiUnit === true) {
    if (builtBefore === true) {
      return { regime: 'RSO', confidence: conf(), reasons, questions };
    }
    if (builtBefore === false) {
      const cutoffYear = now.getFullYear() - 15;
      if (facts.yearBuilt != null && facts.yearBuilt >= cutoffYear) {
        const nearCutoff = facts.yearBuilt === cutoffYear || facts.yearBuilt === cutoffYear + 1;
        reasons.push(
          `Built in ${facts.yearBuilt} — within the last 15 years, so likely exempt from AB 1482's rent cap (new construction). Citywide Just Cause still applies.`,
        );
        if (nearCutoff) {
          reasons.push('This is near the 15-year cutoff — the exact certificate-of-occupancy date may affect this.');
        }
        return { regime: 'JCO_ONLY', confidence: nearCutoff ? 'medium' : conf(), reasons, questions };
      }
      reasons.push('Built after the RSO cutoff with multiple units → AB 1482 applies');
      return { regime: 'AB1482', confidence: conf(), reasons, questions };
    }
    // builtBefore === null but multi-unit → lean RSO, confirm the build date.
    reasons.push('Multiple units, but the build date is uncertain → likely RSO pending confirmation');
    return { regime: 'RSO', confidence: 'medium', reasons, questions };
  }

  if (multiUnit === false) {
    // Single-family / condo: AB1482 unless landlord gave an exemption notice; citywide JCO just-cause always applies.
    if (answers.hasAb1482ExemptionNotice === undefined) {
      questions.push('AB1482_EXEMPTION_NOTICE');
      reasons.push('Single-family/condo may be exempt from AB 1482 rent caps (depends on a landlord notice)');
      return { regime: 'JCO_ONLY', confidence: 'low', reasons, questions };
    }
    if (answers.hasAb1482ExemptionNotice) {
      reasons.push('Landlord gave an AB 1482 exemption notice → no state rent cap, but citywide Just Cause still applies');
      return { regime: 'JCO_ONLY', confidence: 'medium', reasons, questions };
    }
    reasons.push('No AB 1482 exemption notice → AB 1482 rent cap applies');
    return { regime: 'AB1482', confidence: 'medium', reasons, questions };
  }

  // multiUnit === null → not enough information yet.
  return { regime: 'UNKNOWN', confidence: 'low', reasons, questions };
}
