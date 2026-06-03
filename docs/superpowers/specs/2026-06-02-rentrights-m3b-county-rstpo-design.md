# RentRights M3-B — County RSTPO 판별 설계 스펙

- **작성일:** 2026-06-02
- **상태:** 설계안 (사용자 승인 완료, 구현 계획 작성 대기)
- **상위 문서:** v1 설계 §14(County RSTPO 확장), M1·M2·M3-A 완료
- **한 줄 정의:** 비편입 LA County 주소를 "관할 외 안내"에서 **실제 County RSTPO 분류**로 격상한다 — 완전적용(cap+정당사유) / 부분적용(정당사유만). 모든 법률 수치는 권위 출처(DCBA)에서 **검증된 값만** 사용하고, 불확실 영역은 인코딩하지 않고 DCBA 안내+캐비얙으로 남긴다.

**검증 출처(2026-06-02 조사):** LA County DCBA RSTPO (dcba.lacounty.gov), Chapter 8.52 LACC. VERIFIED/UNCERTAIN 분리는 §1 참조. ([[rentrights-real-accurate-data]])

---

## 1. 검증된 데이터 (인코딩 대상) vs 불확실 (DCBA로)

**VERIFIED (HIGH, 인코딩):**
- 적용: **비편입 LA County 한정** (편입시는 각자 조례 — 본 도구 범위 외).
- 완전적용(rent cap + 정당사유): **2세대 이상 AND 준공 CO ≤ 1995-02-01.**
- 부분적용(정당사유만, cap 없음): 단독주택·콘도·1995-02-01 이후 신축.
- 표준 cap: **1.93%** (2025-07-01 ~ 2026-06-30; 공식 = 60%×CPI, 최대 3%). 소규모 임대인 최대 4%, 럭셔리 최대 5%(사용자가 모를 수 있어 표준을 기본값으로).

**UNCERTAIN (인코딩 금지 → DCBA 포인터 + "추정·DCBA 확인" 캐비얙):** 세부 면제(소유주거주·정부보조), 이주비 정확 금액, AB1482 레이어링, 최소 거주기간, 2026-07-01 이후 cap.

---

## 2. 범위

**포함:** 신규 레짐 2개(`COUNTY_RSTPO`/`COUNTY_JCO`) + 비편입 판별 엔진 + 비편입 필지 조회 + County cap(LEGAL dated) + 인상 체커 연동 + rights/i18n + 컴포넌트 연동 + 테스트.

**제외:** 기타 편입시(WeHo·Santa Monica 등) 판별; UNCERTAIN 항목 인코딩; 소규모/럭셔리 cap 변형 자동판정(노트로 안내); 배포(M3-C)·CI(M3-D).

**비목표:** County 법적 단정. "추정·DCBA 확인" 상시; County 수치는 법률단체 사인오프 트랙([[rentrights-gethelp-needs-legal-signoff]]).

---

## 3. 컴포넌트 설계

### 3.1 법률 상수 — `lib/legal/constants.ts`
- `countyCapPct: [{ value: 1.93, effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', source: 'LA County DCBA RSTPO (60% of CPI, max 3%)', expectedUpdate: '2026-07-01' }] as DatedValue<number>[]`.
- `countyBuildCutoffYear: 1995`, `countyBuildCutoffNote: 'CO on or before February 1, 1995'`.
- (cap 갱신 워치리스트에 County 7/1 추가; `lastVerified` 유지.)

### 3.2 타입 — `lib/rules/types.ts`
- `Regime`에 `'COUNTY_RSTPO' | 'COUNTY_JCO'` 추가.
- `ReasonCode`에 추가: `COUNTY_UNINCORPORATED`, `COUNTY_BUILT_BEFORE_1995`(params {year}), `COUNTY_BUILT_AFTER_1995`({year}), `COUNTY_BUILT_1995_AMBIGUOUS`, `COUNTY_MULTIUNIT`({count}), `COUNTY_SFR_OR_CONDO`. `ALL_REASON_CODES`에 반영.

### 3.3 엔진 — `lib/rules/engine.ts`
- 비편입 분기(`!jurisdiction.inLACity && jurisdiction.placeName === null`)를 County 판별로 교체:
  - reasons: `COUNTY_UNINCORPORATED`로 시작.
  - **build era**(County 컷오프 1995): `answers.builtBeforeOct1978` 재사용 불가 — 별도 판정. yearBuilt < 1995 → before(`COUNTY_BUILT_BEFORE_1995`); > 1995 → after(`COUNTY_BUILT_AFTER_1995`); == 1995 → ambiguous(`COUNTY_BUILT_1995_AMBIGUOUS`, medium); null → 질문(`BUILT_BEFORE_OCT_1978` 대신 새 질문은 만들지 않고, 누락 시 medium + facts 기반만; **간결성 위해** yearBuilt null이면 medium·근거에 "준공연도 불명"). (확인질문 신규 추가 안 함 — 범위 제한.)
  - **multiUnit**: 기존 units/`isCondo`/`isSeparateHouse`/`useCodeKind` 로직 재사용(2+ 다세대, 단독/콘도 분리).
  - 결정: 다세대 && before(또는 1995-ambiguous) → `COUNTY_RSTPO`(reasons + `COUNTY_MULTIUNIT`); 그 외(단독·콘도·1995 이후·단일세대) → `COUNTY_JCO`(reasons + `COUNTY_SFR_OR_CONDO` 또는 after).
  - confidence: 명확 → high; 1995-경계/yearBuilt 불명 → medium.
  - **편입 타시**(placeName ≠ null)는 그대로 `OUT_OF_JURISDICTION`.
- 엔진은 순수 유지. (`now`는 build-era엔 불필요; 1995는 고정.)

### 3.4 필지 조회 — `lib/compute/lookup.ts`
- 현재 `if (jurisdiction.inLACity)` 에서만 `getParcel` 호출 → **`if (jurisdiction.inLACity || jurisdiction.placeName === null)`** 로 확장 (Assessor는 County 전역 커버). 비편입도 facts 확보. 실패/누락 시 기존 `dataWarnings` 폴백.

### 3.5 인상 체커 — `lib/rules/increase.ts`
- allowlist에 `COUNTY_RSTPO`(→`LEGAL.countyCapPct` 선택, 표준 1.93%) + `COUNTY_JCO`(→`NO_CAP`).
- `COUNTY_RSTPO`는 RSO처럼 구체값 경로(현재 단일 기간; 기간 없으면 `NOT_APPLICABLE`).

### 3.6 콘텐츠/UI
- `lib/content/rights.ts`: `RIGHTS_POINTS`에 `COUNTY_RSTPO`(예: 정당사유, 12개월 1회 cap, 이주비 가능, 통지기간, "소규모/럭셔리 임대인은 한도가 더 높을 수 있음" 노트 → point) 와 `COUNTY_JCO`(정당사유만, cap 없음, AB1482가 겹칠 수 있음, DCBA 확인) 추가. `capLabel`/`capStaleness`에 `COUNTY_RSTPO`→`countyCapPct`. `COUNTY_JCO`는 capNone.
- `components/ResultCard.tsx`: 기존 cap 게이트 `regime !== 'OUT_OF_JURISDICTION' && regime !== 'UNKNOWN'`는 COUNTY_RSTPO/COUNTY_JCO 모두 통과 → COUNTY_RSTPO는 county cap, COUNTY_JCO는 capNone 표시. (변경 최소.)
- `components/IncreaseChecker.tsx`: cap-레짐 집합에 `COUNTY_RSTPO` 추가, no-cap 집합에 `COUNTY_JCO` 추가(JCO_ONLY와 동일 처리).
- `components/GetHelp.tsx`/`app/page.tsx`: 비편입 시 DCBA 우선(현행 `placeName === null` 플래그 유지).

### 3.7 i18n — `messages/{en,es}.json`
- `rights.COUNTY_RSTPO.{title,point1..N}`, `rights.COUNTY_JCO.{title,point1..N}`, `reason.COUNTY_*` 키(en/es). 기존 카탈로그 완전성 + 코드 커버리지 테스트(ALL_REASON_CODES, REGIMES)가 새 키 강제.

---

## 4. 데이터 흐름
주소 → Census(비편입이면 placeName null) → **Assessor 필지(비편입도 조회)** → 엔진이 1995 컷오프+세대수로 COUNTY_RSTPO/COUNTY_JCO 판정 → ResultCard가 cap(county 1.93%)·권리·confidence 렌더, IncreaseChecker가 county cap으로 인상 판정, GetHelp가 DCBA 우선. 모든 수치는 LEGAL.countyCapPct(검증)에서.

## 5. 오류 처리 & 엣지
- 비편입 + 필지 누락 → medium confidence + dataWarnings(기존). 
- yearBuilt == 1995 → medium + CO(2/1) 캐비얙.
- County cap 기간 없음(2026-07 이후 미검증) → capLabel staleness/"See DCBA", 체커 NOT_APPLICABLE. 정직.
- 소규모/럭셔리 → 표준값 + "더 높을 수 있음" 노트(인코딩 안 함).
- UNCERTAIN 전부 → DCBA 포인터 + 캐비얙.

## 6. 테스트 (검증 데이터)
- **엔진(`tests/rules/engine.test.ts` 확장):** 비편입(placeName null)+units≥2+yearBuilt 1990 → `COUNTY_RSTPO`; +단독(units 1) → `COUNTY_JCO`; yearBuilt 2010 다세대 → `COUNTY_JCO`(1995 이후); yearBuilt 1995 → medium; 편입 WeHo(placeName='West Hollywood city') → `OUT_OF_JURISDICTION`(회귀).
- **lookup(`tests/compute/lookup.test.ts`):** 비편입(placeName null) → getParcel 호출됨 + facts 반영.
- **increase(`tests/rules/increase.test.ts`):** COUNTY_RSTPO 1.93%(2000→2030 within? 2000*1.0193=2038.6 → 2030 within, 2100 over); COUNTY_JCO NO_CAP.
- **카탈로그 커버리지:** 새 Regime/ReasonCode 키 존재(en/es).
- **컴포넌트:** ResultCard COUNTY_RSTPO(cap 표시)·COUNTY_JCO(no cap); IncreaseChecker COUNTY_RSTPO 폼.
- **E2E(`e2e/county.spec.ts`, 라이브):** 실제 비편입 주소(예: `1000 N Eastern Ave, East Los Angeles, CA`) → County 결과 문구 + DCBA. (날짜-안정: 분류·DCBA는 안정; cap 값 단언 회피.)
- 전 회귀 green + 라이브 e2e.

## 7. 컴포넌트 경계 요약
| 유닛 | 책임 | 의존 |
|---|---|---|
| `resolveRegime`(확장) | 비편입→County 분류 | constants(countyCutoff), types |
| `lookup`(변경) | 비편입도 필지 조회 | clients |
| `checkIncrease`(확장) | COUNTY_RSTPO cap 비교 | countyCapPct |
| `rights`/`capLabel`(확장) | County 권리·cap 문구 | countyCapPct, catalog |
| ResultCard/IncreaseChecker(확장) | 새 레짐 렌더 | rights, increase |
| 카탈로그(추가) | County 문구 | — |

---

## 8. 향후(이 팩 밖)
- **M3-C:** 배포 하드닝. **M3-D:** CI. **추가:** 기타 편입시 판별, 소규모/럭셔리 cap 변형, UNCERTAIN 항목 인코딩(법률 검토 후).
- **병행:** County 법률 수치 + ES 문구 법률단체 사인오프([[rentrights-gethelp-needs-legal-signoff]], [[rentrights-real-accurate-data]]).
