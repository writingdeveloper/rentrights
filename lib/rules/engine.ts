import { LEGAL } from '@/lib/legal/constants';
import { Confidence, Jurisdiction, ParcelFacts, QuestionId, ReasonItem, RegimeResult, UserAnswers } from './types';

export interface ResolveInput {
  jurisdiction: Jurisdiction;
  facts: ParcelFacts;
  answers?: UserAnswers;
  now?: Date;
}

// Classify an LA County Assessor use code. Verify/extend the code sets against the
// official LA County use-code reference when adding condo-specific codes.
//   01xx = single-family residence, 05xx = 5+ unit apartment building.
export function useCodeKind(useCode: string | null): 'apartment' | 'sfr' | 'condo' | 'ambiguous' {
  if (!useCode) return 'ambiguous';
  if (useCode.startsWith('05')) return 'apartment';
  if (useCode.startsWith('01')) return 'sfr';
  return 'ambiguous';
}

export function resolveRegime({ jurisdiction, facts, answers = {}, now = new Date() }: ResolveInput): RegimeResult {
  if (!jurisdiction.inLACity) {
    if (jurisdiction.placeName !== null) {
      return {
        regime: 'OUT_OF_JURISDICTION',
        confidence: 'high',
        reasons: [{ code: 'OUT_OF_LA_CITY', params: { placeName: jurisdiction.placeName } }],
        questions: [],
      };
    }
    if (jurisdiction.inLACounty) {
      return resolveCounty(facts, answers);
    }
    return {
      regime: 'OUT_OF_JURISDICTION',
      confidence: 'high',
      reasons: [{ code: 'OUTSIDE_LA' }],
      questions: [],
    };
  }

  const reasons: ReasonItem[] = [{ code: 'IN_LA_CITY' }];
  const questions: QuestionId[] = [];
  const unsure = answers.unsure ?? [];

  // --- Build era (an explicit answer overrides parcel data) ---
  let builtBefore: boolean | null;
  if (answers.builtBeforeOct1978 !== undefined) {
    builtBefore = answers.builtBeforeOct1978;
    reasons.push({ code: builtBefore ? 'SAID_BUILT_BEFORE_1978' : 'SAID_BUILT_AFTER_1978' });
  } else if (unsure.includes('BUILT_BEFORE_OCT_1978')) {
    builtBefore = null;
    reasons.push({ code: 'ASSUMED_BUILD_UNKNOWN' });
  } else if (facts.yearBuilt == null) {
    builtBefore = null;
    questions.push('BUILT_BEFORE_OCT_1978');
  } else if (facts.yearBuilt < LEGAL.rsoBuildCutoffYear) {
    builtBefore = true;
    reasons.push({ code: 'BUILT_BEFORE_CUTOFF', params: { year: facts.yearBuilt } });
  } else if (facts.yearBuilt > LEGAL.rsoBuildCutoffYear) {
    builtBefore = false;
    reasons.push({ code: 'BUILT_AFTER_CUTOFF', params: { year: facts.yearBuilt } });
  } else {
    builtBefore = null; // exactly 1978 — CO date ambiguous
    reasons.push({ code: 'BUILT_1978_AMBIGUOUS' });
    questions.push('BUILT_BEFORE_OCT_1978');
  }

  // --- Unit count / single-family (an explicit answer overrides parcel data) ---
  let multiUnit: boolean | null;
  if (answers.isCondo === true) {
    multiUnit = false;
    reasons.push({ code: 'SAID_CONDO' });
  } else if (answers.isSeparateHouse === true) {
    multiUnit = false;
    reasons.push({ code: 'SAID_SEPARATE_HOUSE' });
  } else if (answers.isSeparateHouse === false) {
    // "Not a separate house" → a building with other units (2+).
    multiUnit = true;
    reasons.push({ code: 'SAID_NOT_SEPARATE_HOUSE' });
  } else if (unsure.includes('IS_SEPARATE_HOUSE')) {
    multiUnit = true;
    reasons.push({ code: 'ASSUMED_MULTIUNIT' });
  } else if (facts.units == null) {
    multiUnit = null;
    questions.push('IS_SEPARATE_HOUSE');
  } else if (facts.units >= 3) {
    multiUnit = true;
    reasons.push({ code: 'UNITS_COUNT', params: { count: facts.units } });
  } else if (facts.units === 2) {
    multiUnit = true;
    reasons.push({ code: 'TWO_UNITS' });
    if (answers.isSeparateHouse === undefined) questions.push('IS_SEPARATE_HOUSE');
  } else {
    multiUnit = false;
    reasons.push({ code: 'SINGLE_UNIT' });
  }

  // Condo confirming question: multi-unit on paper, but the use code does not clearly
  // say "apartment" — it could be individually-owned condos (AB 1482 treats those like SFRs).
  if (multiUnit === true && answers.isCondo === undefined && useCodeKind(facts.useCode) !== 'apartment') {
    if (unsure.includes('IS_CONDO')) reasons.push({ code: 'ASSUMED_NOT_CONDO' });
    else questions.push('IS_CONDO');
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
        reasons.push({ code: 'NEW_CONSTRUCTION_EXEMPT', params: { year: facts.yearBuilt } });
        if (nearCutoff) {
          reasons.push({ code: 'NEAR_15YR_CUTOFF' });
        }
        return { regime: 'JCO_ONLY', confidence: nearCutoff ? 'medium' : conf(), reasons, questions };
      }
      reasons.push({ code: 'MULTIUNIT_AB1482' });
      return { regime: 'AB1482', confidence: conf(), reasons, questions };
    }
    // builtBefore === null but multi-unit → lean RSO, confirm the build date.
    reasons.push({ code: 'MULTIUNIT_BUILDDATE_UNCERTAIN' });
    return { regime: 'RSO', confidence: 'medium', reasons, questions };
  }

  if (multiUnit === false) {
    // Single-family / condo: AB1482 unless landlord gave an exemption notice; citywide JCO just-cause always applies.
    if (answers.hasAb1482ExemptionNotice === undefined && !unsure.includes('AB1482_EXEMPTION_NOTICE')) {
      questions.push('AB1482_EXEMPTION_NOTICE');
      reasons.push({ code: 'SFR_MAYBE_EXEMPT' });
      return { regime: 'JCO_ONLY', confidence: 'low', reasons, questions };
    }
    if (unsure.includes('AB1482_EXEMPTION_NOTICE')) {
      reasons.push({ code: 'ASSUMED_NO_EXEMPTION' });
      reasons.push({ code: 'NO_EXEMPTION_NOTICE' });
      return { regime: 'AB1482', confidence: 'medium', reasons, questions };
    }
    if (answers.hasAb1482ExemptionNotice) {
      reasons.push({ code: 'EXEMPTION_NOTICE_GIVEN' });
      return { regime: 'JCO_ONLY', confidence: 'medium', reasons, questions };
    }
    reasons.push({ code: 'NO_EXEMPTION_NOTICE' });
    return { regime: 'AB1482', confidence: 'medium', reasons, questions };
  }

  // multiUnit === null → not enough information yet.
  return { regime: 'UNKNOWN', confidence: 'low', reasons, questions };
}

// Unincorporated LA County → County RSTPO. Fully covered (cap + just cause) requires
// 2+ units AND certificate of occupancy on or before Feb 1, 1995 (approximated by year built).
function resolveCounty(facts: ParcelFacts, answers: UserAnswers): RegimeResult {
  const reasons: ReasonItem[] = [{ code: 'UNINCORPORATED_COUNTY' }];
  const questions: QuestionId[] = [];
  const unsure = answers.unsure ?? [];

  let builtBeforeCounty: boolean | null;
  if (facts.yearBuilt == null) {
    builtBeforeCounty = null;
    reasons.push({ code: 'COUNTY_BUILT_UNKNOWN' });
  } else if (facts.yearBuilt < LEGAL.countyBuildCutoffYear) {
    builtBeforeCounty = true;
    reasons.push({ code: 'COUNTY_BUILT_BEFORE_1995', params: { year: facts.yearBuilt } });
  } else if (facts.yearBuilt > LEGAL.countyBuildCutoffYear) {
    builtBeforeCounty = false;
    reasons.push({ code: 'COUNTY_BUILT_AFTER_1995', params: { year: facts.yearBuilt } });
  } else {
    builtBeforeCounty = null;
    reasons.push({ code: 'COUNTY_BUILT_1995_AMBIGUOUS' });
  }

  // Unit count / single-family — reuse the same neutral reason codes & questions as the city path.
  let multiUnit: boolean | null;
  if (answers.isCondo === true) {
    multiUnit = false;
    reasons.push({ code: 'SAID_CONDO' });
  } else if (answers.isSeparateHouse === true) {
    multiUnit = false;
    reasons.push({ code: 'SAID_SEPARATE_HOUSE' });
  } else if (answers.isSeparateHouse === false) {
    multiUnit = true;
    reasons.push({ code: 'SAID_NOT_SEPARATE_HOUSE' });
  } else if (unsure.includes('IS_SEPARATE_HOUSE')) {
    multiUnit = true;
    reasons.push({ code: 'ASSUMED_MULTIUNIT' });
  } else if (facts.units == null) {
    multiUnit = null;
    questions.push('IS_SEPARATE_HOUSE');
  } else if (facts.units >= 3) {
    multiUnit = true;
    reasons.push({ code: 'UNITS_COUNT', params: { count: facts.units } });
  } else if (facts.units === 2) {
    multiUnit = true;
    reasons.push({ code: 'TWO_UNITS' });
    if (answers.isSeparateHouse === undefined) questions.push('IS_SEPARATE_HOUSE');
  } else {
    multiUnit = false;
    reasons.push({ code: 'SINGLE_UNIT' });
  }
  if (multiUnit === true && answers.isCondo === undefined && useCodeKind(facts.useCode) !== 'apartment') {
    if (unsure.includes('IS_CONDO')) reasons.push({ code: 'ASSUMED_NOT_CONDO' });
    else questions.push('IS_CONDO');
  }

  const conf: Confidence = questions.length === 0 ? 'high' : 'medium';

  if (multiUnit === true) {
    if (builtBeforeCounty === true) return { regime: 'COUNTY_RSTPO', confidence: conf, reasons, questions };
    if (builtBeforeCounty === false) return { regime: 'COUNTY_JCO', confidence: conf, reasons, questions };
    return { regime: 'COUNTY_RSTPO', confidence: 'medium', reasons, questions };
  }
  if (multiUnit === false) {
    return { regime: 'COUNTY_JCO', confidence: conf, reasons, questions };
  }
  return { regime: 'COUNTY_JCO', confidence: 'low', reasons, questions };
}
