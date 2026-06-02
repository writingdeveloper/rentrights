export type Regime = 'RSO' | 'AB1482' | 'JCO_ONLY' | 'OUT_OF_JURISDICTION' | 'UNKNOWN';
export type Confidence = 'high' | 'medium' | 'low';

// M1 confirming questions (condo-conversion & 15-yr-exemption nuances are M2).
export type QuestionId =
  | 'BUILT_BEFORE_OCT_1978'
  | 'IS_SEPARATE_HOUSE'
  | 'AB1482_EXEMPTION_NOTICE';

export interface Jurisdiction {
  inLACity: boolean;
  placeName: string | null;
  incorporated: boolean;
}

export interface ParcelFacts {
  yearBuilt: number | null;
  units: number | null;
  useCode: string | null;
}

export interface UserAnswers {
  builtBeforeOct1978?: boolean;
  isSeparateHouse?: boolean; // true => the 2nd unit is an ADU/guest house (treat as single-family)
  hasAb1482ExemptionNotice?: boolean;
}

export interface RegimeResult {
  regime: Regime;
  confidence: Confidence;
  reasons: string[];
  questions: QuestionId[];
}
