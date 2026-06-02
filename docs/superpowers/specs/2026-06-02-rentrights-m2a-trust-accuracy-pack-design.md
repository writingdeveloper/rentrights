# RentRights M2-A — 신뢰·정확도 팩 (Trust & Accuracy Pack) 설계 스펙

- **작성일:** 2026-06-02
- **상태:** 설계안 (사용자 승인 완료, 구현 계획 작성 대기)
- **상위 문서:** `docs/superpowers/specs/2026-06-02-rentrights-design.md` (v1 설계), `docs/superpowers/plans/2026-06-02-rentrights-m1-estimator-core.md` (M1 완료)
- **한 줄 정의:** M1 추정기 위에 ① 확인질문 확장(콘도·15년 신축면제·비편입 카운티) ② get-help 단체 디렉터리 ③ 수치별 staleness 경고를 더해 "정직한 추정기"의 신뢰도와 정확도를 완성하는 작은 응집 팩.

---

## 1. 목표와 범위

M1은 주소 → 레짐(RSO/AB1482/JCO/관할외) + 신뢰도 + 근거 + 3개 확인질문을 제공한다. M2-A는 **출시 신뢰도**를 끌어올리는 세 가지 작은 추가를 한 번에 다룬다. 모두 M1의 순수 엔진/콘텐츠/UI 패턴을 직접 확장하며 외부 의존성이 없다(get-help 링크 검증 제외).

**포함**
1. **확인질문 확장**
   - 콘도 분양 여부 질문 (`IS_CONDO`)
   - AB1482 15년 신축면제 **자동 계산** (질문 아님 — `yearBuilt` 기반)
   - 비편입 LA County **안내** (질문 아님 — Census 결과 기반)
2. **get-help 디렉터리** — LAHD·Stay Housed LA·SAJE·LAFLA + 리서치로 발굴한 추가 정당 단체, 현행 URL·전화 웹 검증, EN 전용
3. **staleness 경고** — 법률 수치별 인라인 마커 (예상 갱신일 경과/게시 대기 시)

**제외 (이 팩 밖)**
- EN/ES i18n — 별도 서브프로젝트 (M2-B). 이 팩 신규 문구는 EN 전용이되 i18n이 감쌀 수 있게 구조화.
- 공유 링크/저장 — 별도 서브프로젝트 (M2-C)
- Playwright E2E + 컴포넌트 테스트 — 별도 서브프로젝트 (M2-D). 이 팩은 Vitest 단위/통합만.
- "현재 월세 입력 → 제안 인상 합법성" 체커(§5.3 트리거 #6) — M3/v2 유지
- County RSTPO/기타 시 레짐 판별 — M3 유지 (비편입 카운티는 *안내*만, 판별 안 함)

**비목표**
- 콘도/면제의 법적 미세 케이스를 100% 단정하는 것. 모호하면 신뢰도를 낮추고 LAHD 확인 경로를 유지한다(M1 원칙 계승).

---

## 2. 컴포넌트 설계 (단일 책임·독립 테스트)

### 2.1 엔진 확장 — `lib/rules/types.ts`, `lib/rules/engine.ts`

**타입 변경 (`types.ts`)**
- `QuestionId`에 `'IS_CONDO'` 추가 → 유니온: `BUILT_BEFORE_OCT_1978 | IS_SEPARATE_HOUSE | AB1482_EXEMPTION_NOTICE | IS_CONDO`.
- `UserAnswers`에 `isCondo?: boolean` 추가.
- `ResolveInput`에 `now?: Date` 추가 (기본 `new Date()`). 15년 컷오프 계산용. 엔진 순수성 유지를 위해 호출부에서 주입 가능.

**(A) 15년 신축면제 — 자동 계산**
- 위치: AB1482 분기(LA시 + `builtBefore === false` + `multiUnit === true`).
- 규칙: `cutoffYear = now.getFullYear() - 15` (예: 2026 → 2011). `facts.yearBuilt != null && facts.yearBuilt >= cutoffYear` 이면:
  - 레짐을 **`JCO_ONLY`** 로 (AB1482 임대료 상한 면제, 단 시티와이드 정당사유 유지).
  - 근거 push: `"Built in {yearBuilt} — within the last 15 years, so likely exempt from AB 1482's rent cap (new construction). Citywide Just Cause still applies."`
  - 신뢰도: 경계 부근(`yearBuilt === cutoffYear` 또는 `cutoffYear + 1`)은 `medium` + 근거에 "exact certificate-of-occupancy date may affect this" 추가. 그 외(명확히 15년 내)는 `conf()` 규칙 따름.
- `yearBuilt`가 null이면 자동 판별 불가 → 기존 흐름(질문) 유지, 면제 자동 적용 안 함.

**(B) 콘도 확인질문 — `IS_CONDO`**
- 헬퍼 `useCodeKind(useCode: string | null): 'apartment' | 'condo' | 'sfr' | 'ambiguous'` (engine.ts 내 또는 작은 별도 모듈). LA County Assessor UseCode 표 기준으로 매핑하며, **정확한 코드 집합은 구현 시 공식 UseCode 참조표로 검증**한다(예: `0100` 계열=SFR, `0500` 계열=5+세대 아파트, 콘도 계열 코드=condo). 미확인/기타 코드는 `ambiguous`.
- 트리거: `multiUnit === true` (units ≥ 2) **그리고** `useCodeKind`가 `'apartment'`가 아님(`condo`·`sfr`·`ambiguous`) **그리고** `answers.isCondo === undefined` → `questions.push('IS_CONDO')`.
  - UseCode가 명확히 `'apartment'`면 콘도 질문을 **묻지 않는다**(과잉질문 방지).
- 효과: `answers.isCondo === true` → 다세대로 보지 않고 **단독/콘도 경로**로 라우팅(= 기존 `multiUnit === false` 분기와 동일: 면제통지 여부에 따라 `JCO_ONLY`/`AB1482`). 근거 push: `"You said this is an individually-owned condo (treated like a single-family home for rent-cap rules)."`
  - `isCondo === false` → 기존 다세대 흐름 유지.
- `IS_SEPARATE_HOUSE`와 공존: 2세대 모호 케이스는 두 질문이 함께 노출될 수 있다(별채 vs 콘도 vs 듀플렉스 구분). 허용한다. `isSeparateHouse === true` 또는 `isCondo === true` 중 하나라도 참이면 단독/콘도 경로.

**(C) 비편입 LA County 안내**
- 위치: 관할 가드(`!jurisdiction.inLACity`).
- `jurisdiction.placeName === null` 이면(Census가 편입시 미반환) 근거를 구체화: `"This address may be in unincorporated LA County, which has its own rules (County RSTPO via DCBA) rather than the City of LA's."` (현재 일반 "outside the City of Los Angeles" 대체).
  - 레짐은 그대로 `OUT_OF_JURISDICTION`, confidence `high` 유지(판별이 아니라 안내).
- get-help 측에서 이 케이스에 County 포인터(DCBA)를 강조 노출(2.3 참조).

### 2.2 Staleness — `lib/legal/constants.ts`, `lib/legal/staleness.ts`

**상수 변경 (`constants.ts`)**
- `DatedValue`(및 `RsoCapPeriod`)에 선택 필드 `expectedUpdate?: string`(`YYYY-MM-DD`) 추가. select.ts의 `DatedValue` 인터페이스에 추가.
- 채울 값(M1 워치리스트 기반):
  - RSO 2025–26 기간(`effectiveTo: 2026-06-30`): `expectedUpdate: '2026-07-01'`.
  - RSO 신공식 기간(`value: null`, `2026-07-01~`): 이미 null이므로 게시 대기로 취급(아래 트리거 참조). `expectedUpdate: '2026-07-01'` 명시.
  - AB1482 현재 기간(`effectiveTo: 2026-07-31`): `expectedUpdate: '2026-08-01'`.
  - 이주비: 상수 구조가 dated 배열이 아니므로(M1에서 단일 객체), staleness 대상에서 **제외**하거나 `source` 옆에 정적 안내만 유지. 이 팩에서는 **RSO·AB1482 % 두 수치만** staleness 대상으로 한다(이주비는 M1대로 "직접 확인 권장" 정적 문구 유지). → 범위 명확화.

**순수 헬퍼 (`staleness.ts`)**
```
export interface Staleness { stale: boolean; expectedUpdate?: string; reason?: string }
export function stalenessFor<T>(items: DatedValue<T>[], onDate: Date): Staleness
```
- 로직:
  1. onDate를 덮는 기간 `p = selectDated(items, onDate)`.
  2. `p`가 있고 `p.value == null` → `{ stale: true, expectedUpdate: p.expectedUpdate, reason: 'pending publication' }` (게시 대기).
  3. `p`가 있고 `p.expectedUpdate`가 있고 `onDate(YYYY-MM-DD) > p.expectedUpdate` → `{ stale: true, expectedUpdate, reason: 'past expected update' }`.
  4. `p`가 없음(매칭 기간 없음, 과거값으로 폴백 불가) → `{ stale: true, reason: 'no current value' }`.
  5. 그 외 → `{ stale: false }`.
- 순수·날짜주입식 → M1 `selectDated`와 동일하게 단위 테스트.

### 2.3 get-help 디렉터리 — `lib/content/help.ts`, `components/GetHelp.tsx`

**타입·데이터 (`help.ts`)**
```
export interface HelpOrg {
  name: string;
  description: string;   // EN, 한 줄
  url: string;           // 현행, 웹 검증
  phone?: string;        // 현행, 웹 검증
  languages?: string[];  // 예: ['English','Spanish']
  tags: ('city'|'legal-aid'|'workshop'|'hotline'|'county')[];
}
export const HELP_ORGS: HelpOrg[];
export function orgsFor(opts: { unincorporatedCounty?: boolean }): HelpOrg[];
```
- **데이터 출처(구현 시 리서치 단계):** 전문가 에이전트 병렬 투입으로 LA 세입자 지원 지형을 조사하고 **현행 URL·전화를 웹으로 검증**한다. 최소 4개 지정 단체(LAHD, Stay Housed LA, SAJE, LAFLA) + 발굴된 정당 단체(후보: Coalition for Economic Survival(CES), Eviction Defense Network, Inner City Law Center, Neighborhood Legal Services LA, LA Tenants Union, Tenant Power Hotline 등 — 검증 후 선별). 죽은 링크·오래된 번호 금지.
- `orgsFor`: 기본은 전체. `unincorporatedCounty: true`면 County(DCBA) 포인터를 상단에 배치.

**컴포넌트 (`GetHelp.tsx`)**
- 단체 카드 리스트(이름·설명·전화 링크`tel:`·사이트 링크). 서버 컴포넌트(상호작용 없음). EN 전용.

### 2.4 UI 와이어링 — `components/ResultCard.tsx`, `components/ConfirmingQuestions.tsx`, `app/page.tsx`

- `ConfirmingQuestions.tsx`: `QUESTION_TEXT`에 `IS_CONDO` 항목 추가(`key: 'isCondo'`, `q: "Is this an individually-owned condominium (not a rental apartment)?"`, yes/no).
- `ResultCard.tsx`: `capLabel` 옆에 인라인 staleness 마커. RSO/AB1482 표시 시 해당 수치의 `stalenessFor(...)` 결과가 `stale`이면 작은 회색 텍스트: `"⚠ This figure is due to update around {expectedUpdate} — confirm the latest with LAHD."` (reason별 문구 분기: pending publication / past expected update / no current value).
- `app/page.tsx`: 결과 영역에 `<GetHelp .../>` 렌더. `data.jurisdiction.placeName === null`이면 `unincorporatedCounty` 전달. OUT_OF_JURISDICTION 결과에도 get-help 노출(범위 외 사용자에게 카운티/일반 도움 안내).

---

## 3. 데이터 흐름

M1 파이프라인 불변(Census → Assessor → 엔진). 변경점:
- `lookup`/엔진 호출 시 `now`(현재 날짜) 주입 → 15년 컷오프 계산. (`lib/compute/lookup.ts`에서 `resolveRegime`에 `now` 전달; 테스트는 고정 날짜 주입.)
- staleness는 **렌더 시점 클라이언트에서 계산**(상수 + `new Date()`). M1의 `capLabel`(onDate 인자)과 동일 패턴으로 `ResultCard`에서 `stalenessFor`를 직접 호출한다. 서버 결과(`LookupResult`)에는 동봉하지 않는다(상수는 클라 번들에도 있고, 날짜 의존이라 클라 계산이 단순).
- get-help는 정적 데이터.

---

## 4. 오류 처리 & 엣지케이스

- `yearBuilt` null + AB1482 분기 → 15년 자동면제 적용 안 함, 기존 질문 흐름(M1 동작 보존).
- UseCode null/기타 → `useCodeKind` = `ambiguous` → 다세대면 콘도 질문 노출.
- 콘도+별채 답변 충돌(`isCondo === true && isSeparateHouse === false`) → 둘 중 하나라도 단독/콘도 경로 트리거이므로 단독/콘도로 처리(보수적·일관).
- staleness: `expectedUpdate` 미설정 상수는 stale 판정에서 해당 조건 스킵(false 가능). 매칭 기간 없음만으로도 stale(reason: no current value).
- get-help 링크: 웹 검증 실패/불확실 단체는 **넣지 않는다**(죽은 링크가 신뢰 훼손). 최소 4개 지정 단체는 반드시 포함.

---

## 5. 테스트 전략 (Vitest, TDD — M1 컨벤션 계승)

- **엔진 (`tests/rules/engine.test.ts` 확장):**
  - 15년 내 신축 다세대(LA, yearBuilt = now-5, units=8) → `JCO_ONLY` + 면제 근거. `now` 고정 주입.
  - 15년 경계(yearBuilt = now-15) → confidence `medium` + COO 캐비엇 근거.
  - 15년 초과 다세대(yearBuilt = now-30) → 여전히 `AB1482`(회귀 보호).
  - 콘도 질문 트리거: 다세대 + UseCode ambiguous + isCondo 미답 → `questions` 에 `IS_CONDO`.
  - UseCode 명확 apartment(`0500`) → `IS_CONDO` **미노출**.
  - `isCondo === true` → 단독/콘도 경로(면제통지 미답 시 `JCO_ONLY` low + `AB1482_EXEMPTION_NOTICE` 질문).
  - 비편입 카운티(inLACity=false, placeName=null) → `OUT_OF_JURISDICTION` + 근거에 unincorporated/County 문구.
- **staleness (`tests/legal/staleness.test.ts` 신규):**
  - value=null 기간 덮는 날짜 → stale, reason pending.
  - expectedUpdate 지난 날짜 → stale, reason past expected.
  - 정상 기간 내 → not stale.
  - 매칭 기간 없음(과거 날짜) → stale, reason no current value.
- **get-help (`tests/content/help.test.ts` 신규):**
  - 모든 `HELP_ORGS`가 `name`·`url`(https)·`tags` 보유, 최소 4개 지정 단체 포함.
  - `orgsFor({ unincorporatedCounty: true })` 첫 항목이 County(DCBA) 태그.
- **회귀:** M1 기존 27개 테스트 전부 green 유지.
- **수동 검증:** 콘도/신축/비편입 시나리오 + staleness 마커 + get-help 렌더를 dev 서버로 1회 확인(라이브 API). E2E 자동화는 M2-D.

---

## 6. 컴포넌트 경계 요약

| 유닛 | 책임 | 의존 |
|---|---|---|
| `useCodeKind` | UseCode → 건물종류 분류 | (없음, 순수) |
| `resolveRegime` (확장) | 사실+답변+now → 레짐/신뢰도/질문 | constants, types |
| `stalenessFor` | dated 상수 + 날짜 → staleness | select(DatedValue) |
| `HELP_ORGS`/`orgsFor` | 단체 디렉터리 데이터·필터 | (없음, 정적) |
| `GetHelp` | 디렉터리 렌더 | help.ts |
| `ResultCard` (확장) | 결과 + staleness 마커 렌더 | rights, staleness |
| `ConfirmingQuestions` (확장) | IS_CONDO 포함 질문 렌더 | types |

---

## 7. 향후(이 팩 밖, 재확인)
- **M2-B:** EN/ES i18n (이 팩 신규 문구 포함 전체 번역)
- **M2-C:** 공유 링크/저장
- **M2-D:** Playwright E2E + 컴포넌트 테스트
- **M3:** County RSTPO 실제 판별, 임대료 인상 합법성 체커, 배포 하드닝
- **병행:** legal-org 검토 패스(코드 외 아웃리치)
