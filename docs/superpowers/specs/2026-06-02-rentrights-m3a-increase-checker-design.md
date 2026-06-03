# RentRights M3-A — 인상 합법성 체커 설계 스펙

- **작성일:** 2026-06-02
- **상태:** 설계안 (사용자 승인 완료, 구현 계획 작성 대기)
- **상위 문서:** `docs/superpowers/specs/2026-06-02-rentrights-design.md` (§14 향후: "제안받은 인상이 합법인가?" 체커), M1·M2 전부 완료
- **한 줄 정의:** 결과 화면에서 세입자가 **현재 월세와 제안받은 새 월세**를 입력하면, 그 인상이 적용 임대법의 **합법 상한을 넘는지** 즉시 판정한다. cap 수치는 검증된 dated `LEGAL` 상수에서만 가져온다(실제·정확 데이터 원칙).

---

## 1. 목표와 범위

세입자의 1순위 질문은 "이 인상이 합법인가?"다. M3-A는 이미 판별된 레짐의 합법 cap을 사용해 제안 인상을 비교 판정한다.

**핵심 데이터 원칙([[rentrights-real-accurate-data]]):** 체커는 cap %를 **새로 정의하지 않는다.** 오직 `lib/legal/constants.ts`의 dated `LEGAL.rsoCapPct`/`ab1482CapPct`(각 값에 `effectiveFrom/effectiveTo/source`, 전체 `lastVerified`)를 날짜 기반으로 선택해 쓴다. 검증은 실제 주소·라이브 API로 한다.

**포함**
1. 순수 판정 모듈 `lib/rules/increase.ts` (`checkIncrease`)
2. `IncreaseChecker` 컴포넌트 (현재/제안 월세 입력 → 즉시 판정)
3. 페이지 결과 블록 통합
4. `increase.*` i18n 카탈로그(en/es)
5. 테스트: Vitest 단위 + 컴포넌트 + E2E 1개 (실제 데이터)

**제외 (이 팩 밖)**
- 12개월 1회 규칙·통지기간의 인터랙티브 판정(날짜 입력) — 권리 항목으로 이미 안내(정적). 핵심은 % cap.
- 새 cap 수치 정의나 별도 하드코딩 — 금지(단일 출처 LEGAL).
- County RSTPO cap(M3-B), 배포(M3-C), CI(M3-D).

**비목표**
- 법적 단정. 결과는 추정이며 "LAHD 확인" 캐비엇 상시.

---

## 2. 컴포넌트 설계

### 2.1 순수 판정 — `lib/rules/increase.ts`
```
import { LEGAL } from '@/lib/legal/constants';
import { Regime } from './types';

export type IncreaseVerdict =
  | 'WITHIN_CAP' | 'OVER_CAP'
  | 'WITHIN_RANGE' | 'OVER_RANGE' | 'UNCERTAIN_RANGE'
  | 'NO_CAP' | 'NEEDS_INPUT' | 'NOT_APPLICABLE';

export interface IncreaseResult {
  verdict: IncreaseVerdict;
  capPct?: number;            // concrete cap %
  capFloorPct?: number;       // pending RSO range
  capCeilingPct?: number;
  allowedMaxRent?: number;    // round2(current*(1+capPct/100))
  allowedMaxAtFloor?: number; // pending: round2(current*(1+floor/100))
  allowedMaxAtCeiling?: number;
  proposedPct?: number;       // round1((proposed-current)/current*100)
}

export function checkIncrease(input: {
  regime: Regime; currentRent: number; proposedRent: number; onDate?: Date;
}): IncreaseResult;
```
- 로직(순수, `onDate` 기본 `new Date()`):
  1. `regime`이 `RSO`/`AB1482`/`JCO_ONLY`가 아니면 → `{ verdict: 'NOT_APPLICABLE' }`.
  2. `JCO_ONLY` → `{ verdict: 'NO_CAP' }`.
  3. rents 유효성: `Number.isFinite` && `currentRent > 0` && `proposedRent >= 0` 아니면 → `{ verdict: 'NEEDS_INPUT' }`.
  4. cap 기간 선택: RSO→`LEGAL.rsoCapPct`, AB1482→`LEGAL.ab1482CapPct`에서 `onDate`를 덮는 기간(기존 `selectDated`와 동일한 날짜 비교; 직접 `find`).
     - 기간 없음 → `{ verdict: 'NOT_APPLICABLE' }`.
     - `value`가 number(구체): `capPct=value`, `allowedMaxRent=round2(current*(1+value/100))`, `proposedPct=round1(...)`. `proposedRent <= allowedMaxRent`(센트 비교) → `WITHIN_CAP` 아니면 `OVER_CAP`.
     - `value`가 null + `floorPct`/`ceilingPct`(RSO 미게시): `allowedMaxAtFloor`, `allowedMaxAtCeiling`, `proposedPct`. `proposed<=floorMax`→`WITHIN_RANGE`, `>ceilingMax`→`OVER_RANGE`, 사이→`UNCERTAIN_RANGE`.
- `round2(x)=Math.round(x*100)/100`, `round1(x)=Math.round(x*10)/10`.

### 2.2 UI — `components/IncreaseChecker.tsx` (`'use client'`)
- props: `{ regime: Regime }`. `useT()`. 로컬 상태 `current`/`proposed`(string inputs).
- regime 분기:
  - OOJ/UNKNOWN → `null`(미렌더).
  - JCO_ONLY → cap-없음 안내(`t('increase.noCap')`)만.
  - RSO/AB1482 → 헤딩 + 두 number 입력 + 라이브 판정.
- 입력 파싱: `parseFloat`; 빈/NaN이면 `checkIncrease`가 `NEEDS_INPUT` → 판정 영역 미표시(또는 힌트). 값 있으면 매 변경마다 `checkIncrease({regime, currentRent, proposedRent})` 호출 → verdict 문구.
- 판정 문구(로케일, params): 
  - `WITHIN_CAP` → t('increase.verdict.withinCap', { max, pct }) (녹색)
  - `OVER_CAP` → t('increase.verdict.overCap', { max, pct }) (적색)
  - `WITHIN_RANGE`/`OVER_RANGE`/`UNCERTAIN_RANGE` → 범위 문구({floorMax, ceilingMax}) + staleness 뉘앙스
  - `NO_CAP` → t('increase.noCap')
- 통화 표시 헬퍼: 달러 반올림 + `$` (예: `$2,060`). 비교는 모듈에서 센트 정밀.
- 하단 캐비엇: `t('increase.caveat')` (추정·LAHD 확인).

### 2.3 페이지 통합 — `app/page.tsx`
- 결과 블록에서 `<ResultCard>` 다음에 `<IncreaseChecker regime={data.result.regime} />` 렌더 (ShareButton/GetHelp 위).

### 2.4 i18n — `messages/{en,es}.json`
- `increase.*` 키(en/es 동일): `heading`, `currentLabel`, `currentPlaceholder`, `proposedLabel`, `proposedPlaceholder`, `verdict.withinCap`, `verdict.overCap`, `verdict.withinRange`, `verdict.overRange`, `verdict.uncertainRange`, `noCap`, `caveat`. 파라미터 토큰: `{max}`, `{pct}`, `{floorMax}`, `{ceilingMax}`.
- 기존 카탈로그 완전성 테스트(en==es 키)가 누락 차단.

---

## 3. 데이터 흐름
사용자가 결과를 본 뒤 현재/제안 월세 입력 → `IncreaseChecker`가 `checkIncrease(regime, …)` 호출 → `checkIncrease`는 dated `LEGAL` cap을 날짜 선택 → verdict + 허용 최대액 계산 → 로케일 문구로 즉시 렌더. 네트워크·서버 무관, 새 데이터 출처 없음.

## 4. 오류 처리 & 엣지케이스
- 빈/음수/비수치 입력 → `NEEDS_INPUT` → 판정 숨김.
- `proposedRent < currentRent`(인하) → 인상 아님 → `WITHIN_CAP`(상한 이하) 자연 처리; 문구는 여전히 "상한 내".
- RSO 미게시 기간(value null) → 정확값 불가 → 범위 판정 + "LAHD가 정확 %를 게시" 뉘앙스.
- 적용 cap 기간 없음(이론상) → `NOT_APPLICABLE`(체커 미표시).
- 부동소수 → 센트 반올림 비교로 경계 안정.

## 5. 테스트 전략 (실제·정확 데이터)
- **Vitest 단위(`tests/rules/increase.test.ts`)**, 고정 `onDate` 주입(검증된 상수 기준):
  - RSO 3%(2026-06-02): current 2000 → max 2060; proposed 2050 → `WITHIN_CAP`; 2200 → `OVER_CAP`.
  - AB1482 8.0%(2026-06-02): current 2000 → max 2160; 2100 → `WITHIN_CAP`; 2300 → `OVER_CAP`.
  - RSO 미게시(onDate 2026-08-01, floor1/ceiling4): current 2000 → floorMax 2020, ceilingMax 2080; 2010→`WITHIN_RANGE`, 2100→`OVER_RANGE`, 2050→`UNCERTAIN_RANGE`.
  - JCO_ONLY→`NO_CAP`; OOJ→`NOT_APPLICABLE`; current 0/NaN→`NEEDS_INPUT`.
  - (이 기대값들은 검증된 LEGAL 상수에서 직접 유도 — 별도 하드코딩 cap 없음.)
- **컴포넌트(`tests/components/increasechecker.test.tsx`, jsdom):** RSO 폼 렌더; current 2000/proposed 2200 입력 → "over" 문구; JCO_ONLY → cap-없음 문구; OOJ → 미렌더.
- **E2E(`e2e/increase.spec.ts`, 라이브):** `1411 Murray Dr`(실제 RSO) 결과 → 체커에 2000/2200(10%) 입력 → "over" 판정. 10%는 RSO 3% 및 미게시 1~4% 범위 양쪽 초과 → **날짜-안정적**.
- 전 회귀: 오프라인 `npm test` green, `npm run e2e` 신규 포함 green, `tsc`/`build` 정상.

## 6. 컴포넌트 경계 요약
| 유닛 | 책임 | 의존 |
|---|---|---|
| `checkIncrease` | regime+rents+date → 판정 | LEGAL(dated), Regime |
| `IncreaseChecker` | 입력·라이브 판정 렌더 | checkIncrease, useT |
| `app/page.tsx`(변경) | 결과 블록에 체커 렌더 | IncreaseChecker |
| 카탈로그(추가) | increase.* 문구 | — |

---

## 7. 향후(이 팩 밖)
- **M3-B:** County RSTPO 실제 판별(+ County cap을 LEGAL에 dated 추가 → 체커가 자동 활용). **M3-C:** 배포 하드닝. **M3-D:** CI.
- **병행:** 법률단체 검토 — ES 문구 + cap 수치 정확성 사인오프([[rentrights-gethelp-needs-legal-signoff]], [[rentrights-real-accurate-data]]).
