export type Regime = 'RSO' | 'AB1482' | 'JCO_ONLY' | 'OUT_OF_JURISDICTION' | 'UNKNOWN';
export type Confidence = 'high' | 'medium' | 'low';

export type QuestionId =
  | 'BUILT_BEFORE_OCT_1978'
  | 'IS_SEPARATE_HOUSE'
  | 'AB1482_EXEMPTION_NOTICE'
  | 'IS_CONDO';

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
  isCondo?: boolean; // true => individually-owned condo (treat like single-family for rent-cap rules)
}

export interface RegimeResult {
  regime: Regime;
  confidence: Confidence;
  reasons: string[];
  questions: QuestionId[];
}
