export type Regime = 'RSO' | 'AB1482' | 'JCO_ONLY' | 'COUNTY_RSTPO' | 'COUNTY_JCO' | 'OUT_OF_JURISDICTION' | 'UNKNOWN';
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
  inLACounty?: boolean;
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
  reasons: ReasonItem[];
  questions: QuestionId[];
}

export type ReasonCode =
  | 'IN_LA_CITY'
  | 'SAID_BUILT_BEFORE_1978'
  | 'SAID_BUILT_AFTER_1978'
  | 'BUILT_BEFORE_CUTOFF'
  | 'BUILT_AFTER_CUTOFF'
  | 'BUILT_1978_AMBIGUOUS'
  | 'SAID_CONDO'
  | 'SAID_SEPARATE_HOUSE'
  | 'SAID_NOT_SEPARATE_HOUSE'
  | 'UNITS_COUNT'
  | 'TWO_UNITS'
  | 'SINGLE_UNIT'
  | 'NEW_CONSTRUCTION_EXEMPT'
  | 'NEAR_15YR_CUTOFF'
  | 'MULTIUNIT_AB1482'
  | 'MULTIUNIT_BUILDDATE_UNCERTAIN'
  | 'SFR_MAYBE_EXEMPT'
  | 'EXEMPTION_NOTICE_GIVEN'
  | 'NO_EXEMPTION_NOTICE'
  | 'OUT_OF_LA_CITY'
  | 'OUTSIDE_LA'
  | 'UNINCORPORATED_COUNTY'
  | 'COUNTY_BUILT_BEFORE_1995'
  | 'COUNTY_BUILT_AFTER_1995'
  | 'COUNTY_BUILT_1995_AMBIGUOUS'
  | 'COUNTY_BUILT_UNKNOWN';

export interface ReasonItem {
  code: ReasonCode;
  params?: Record<string, string | number>;
}

export type WarningCode = 'DATA_INCOMPLETE' | 'RECORDS_UNAVAILABLE';
export type ErrorCode = 'INVALID_BODY' | 'ADDRESS_REQUIRED' | 'ADDRESS_NOT_FOUND' | 'UPSTREAM_ERROR';

export const ALL_REASON_CODES: ReasonCode[] = [
  'IN_LA_CITY', 'SAID_BUILT_BEFORE_1978', 'SAID_BUILT_AFTER_1978', 'BUILT_BEFORE_CUTOFF',
  'BUILT_AFTER_CUTOFF', 'BUILT_1978_AMBIGUOUS', 'SAID_CONDO', 'SAID_SEPARATE_HOUSE',
  'SAID_NOT_SEPARATE_HOUSE', 'UNITS_COUNT',
  'TWO_UNITS', 'SINGLE_UNIT', 'NEW_CONSTRUCTION_EXEMPT', 'NEAR_15YR_CUTOFF', 'MULTIUNIT_AB1482',
  'MULTIUNIT_BUILDDATE_UNCERTAIN', 'SFR_MAYBE_EXEMPT', 'EXEMPTION_NOTICE_GIVEN', 'NO_EXEMPTION_NOTICE',
  'OUT_OF_LA_CITY', 'OUTSIDE_LA', 'UNINCORPORATED_COUNTY',
  'COUNTY_BUILT_BEFORE_1995', 'COUNTY_BUILT_AFTER_1995', 'COUNTY_BUILT_1995_AMBIGUOUS', 'COUNTY_BUILT_UNKNOWN',
];
export const ALL_WARNING_CODES: WarningCode[] = ['DATA_INCOMPLETE', 'RECORDS_UNAVAILABLE'];
export const ALL_ERROR_CODES: ErrorCode[] = ['INVALID_BODY', 'ADDRESS_REQUIRED', 'ADDRESS_NOT_FOUND', 'UPSTREAM_ERROR'];
