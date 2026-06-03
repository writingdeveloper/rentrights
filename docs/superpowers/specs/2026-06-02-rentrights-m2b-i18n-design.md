# RentRights M2-B — EN/ES i18n 설계 스펙

- **작성일:** 2026-06-02
- **상태:** 설계안 (사용자 승인 완료, 구현 계획 작성 대기)
- **상위 문서:** `docs/superpowers/specs/2026-06-02-rentrights-design.md` (v1, §4 언어 토글·§15.3 EN+ES 확정), M1/M2-A 완료
- **한 줄 정의:** RentRights 전체 사용자 경험(정적 UI + 엔진 근거 + 도움단체)을 영어/스페인어로 제공한다. 엔진은 언어 무관한 reason 코드를 반환하고, 클라이언트가 활성 로케일로 렌더한다.

---

## 1. 목표와 범위

스페인어는 LA 세입자 도달의 출시 필수 요건(spec §15.3). M2-B는 모든 사용자 대면 문자열을 EN/ES로 제공한다. 핵심 설계 원칙: **엔진/`/api/lookup`은 로케일 무관**(reason·warning·error 코드만 반환), **번역은 클라이언트 경계에서**.

**포함**
1. 경량 커스텀 메시지 카탈로그 (`messages/en.json`, `messages/es.json`) + 순수 `translate()` + `LocaleProvider`/`useT()`
2. 엔진 `reasons`를 영어 문장 → **reason 코드+파라미터**로 리팩터
3. `dataWarnings`·API 에러를 **코드**로 변경 (로케일 무관 API 유지)
4. 콘텐츠(`rights.ts`·`help.ts`)·컴포넌트·페이지·layout 메타데이터 로케일화
5. 헤더 EN/ES **토글** + 쿠키 영속 + 첫 방문 **Accept-Language 자동감지**
6. 전체 ES 번역 작성 (법률 용어는 법률단체 검토 트랙에 사인오프 항목 기록)

**제외 (이 팩 밖)**
- 영어/스페인어 외 언어 (한/아르메니아/중국어는 구조만 확장 가능, 추가는 향후)
- 경로 기반 `/[locale]` 라우팅 — 토글+쿠키로 충분; 공유링크 시 언어 고정은 M2-C
- 공유 링크/저장 (M2-C), Playwright E2E·컴포넌트 테스트 (M2-D)
- get-help 단체 **고유명·URL·전화** 번역 (설명문만 번역; 이름/연락처는 불변)

**비목표**
- ES 법률 용어의 최종 정확성 보증 — 초안은 Claude가 작성, 공개 출시 전 법률단체 검토 필수([[rentrights-gethelp-needs-legal-signoff]]와 동일 트랙).

---

## 2. 컴포넌트 설계 (단일 책임·독립 테스트)

### 2.1 i18n 코어 — `lib/i18n/`

**`lib/i18n/catalog.ts`**
- `export type Locale = 'en' | 'es';`
- `messages/en.json`·`messages/es.json` import → `export const CATALOG: Record<Locale, Record<string, string>>`.
- 카탈로그 키는 점-구분 평면 문자열 (예: `page.tagline`). 값에 `{param}` 플레이스홀더.

**`lib/i18n/t.ts`** (순수)
```
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string
```
- 로직: `CATALOG[locale][key]` 조회 → 없으면 `CATALOG.en[key]`(EN 폴백) → 그래도 없으면 `key` 자체 반환. 찾은 문자열의 `{name}` 토큰을 `params[name]`로 치환(누락 토큰은 그대로 둠).

**`lib/i18n/detect.ts`** (순수)
```
export function pickInitialLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale
```
- 로직: `cookieValue`가 `'en'|'es'`면 그 값 → 아니면 `acceptLanguage`(소문자)에 `es` 토큰 포함 시 `'es'` → 기본 `'en'`.

**`lib/i18n/LocaleProvider.tsx`** (`'use client'`)
- React Context. `LocaleProvider({ initialLocale, children })`가 `locale` 상태 보유.
- `useLocale(): { locale: Locale; setLocale: (l: Locale) => void }` — `setLocale`은 상태 갱신 + `document.cookie = 'rr_locale=<l>; path=/; max-age=31536000'`.
- `useT(): (key: string, params?) => string` — `(key, params) => translate(locale, key, params)`.

### 2.2 엔진 reason 코드화 — `lib/rules/types.ts`, `lib/rules/engine.ts`

**타입 변경 (`types.ts`)**
```
export type ReasonCode =
  | 'IN_LA_CITY'
  | 'SAID_BUILT_BEFORE_1978' | 'SAID_BUILT_AFTER_1978'
  | 'BUILT_BEFORE_CUTOFF' | 'BUILT_AFTER_CUTOFF' | 'BUILT_1978_AMBIGUOUS'
  | 'SAID_CONDO' | 'SAID_SEPARATE_HOUSE'
  | 'UNITS_COUNT' | 'TWO_UNITS' | 'SINGLE_UNIT'
  | 'NEW_CONSTRUCTION_EXEMPT' | 'NEAR_15YR_CUTOFF'
  | 'MULTIUNIT_AB1482' | 'MULTIUNIT_BUILDDATE_UNCERTAIN'
  | 'SFR_MAYBE_EXEMPT' | 'EXEMPTION_NOTICE_GIVEN' | 'NO_EXEMPTION_NOTICE'
  | 'OUT_OF_LA_CITY' | 'UNINCORPORATED_COUNTY';

export interface ReasonItem { code: ReasonCode; params?: Record<string, string | number>; }
```
- `RegimeResult.reasons: string[]` → `reasons: ReasonItem[]`.

**엔진 (`engine.ts`)**
- 분기·신뢰도·`questions` 로직 전부 **불변**. 각 `reasons.push('영문')`을 대응 `reasons.push({ code, params })`로 치환:
  - `BUILT_BEFORE_CUTOFF`/`BUILT_AFTER_CUTOFF`/`NEW_CONSTRUCTION_EXEMPT` → `params: { year: facts.yearBuilt }`
  - `UNITS_COUNT` → `params: { count: facts.units }`
  - `OUT_OF_LA_CITY` → `params: { placeName }`
  - 나머지는 params 없음.
- 기존 reason-문자열 테스트 2개(엔진 테스트의 `within the last 15 years`, `unincorporated`)를 `reasons.some(r => r.code === '...')` 단언으로 변경.

### 2.3 dataWarnings + API 에러 코드화 — `lib/compute/lookup.ts`, `app/api/lookup/route.ts`

- `lib/compute/lookup.ts`: `type WarningCode = 'DATA_INCOMPLETE' | 'RECORDS_UNAVAILABLE';` `LookupResult.dataWarnings: WarningCode[]`. 두 `dataWarnings.push('영문')`을 코드로 교체.
- `app/api/lookup/route.ts`: 에러 응답을 `{ error: ErrorCode }`로. `type ErrorCode = 'INVALID_BODY' | 'ADDRESS_REQUIRED' | 'ADDRESS_NOT_FOUND' | 'UPSTREAM_ERROR';` (400/400/404/502 매핑 유지).
- **`LookupResult` 및 `/api/lookup` 응답은 로케일 무관** — 모든 문자열성 출력이 코드/파라미터. 번역은 클라가 담당.

### 2.4 콘텐츠 로케일화 — `lib/content/rights.ts`, `lib/content/help.ts`

- `rights.ts`:
  - `RIGHTS_TEXT`(레짐별 title+points)·`capLabel`·`stalenessMessage`의 영문 리터럴 → 카탈로그 키. 함수 시그니처에 `t: (key, params?) => string` 주입(순수 유지, 전역 로케일 안 읽음). 예: `capLabel(regime, t, onDate?)`, `rightsText(regime, t)`, `stalenessMessage(s, t, regime?)`.
  - 단, 카탈로그 키 매핑은 함수 내부에서; 호출부(ResultCard)가 `useT()`의 `t`를 넘김.
- `help.ts`: `HelpOrg.description` 제거 → `descriptionKey: string`(예: `help.LAHD.description`). `name`/`url`/`phone`/`tags`/`languages` 불변. `orgsFor` 로직 불변. (설명문은 카탈로그에서 `t(descriptionKey)`로 렌더.)

### 2.5 UI 로케일화 — `components/*`, `app/page.tsx`, `app/layout.tsx`

- `ResultCard`/`ConfirmingQuestions`/`Disclaimer`/`GetHelp`/`app/page.tsx`: 하드코딩 문구 → `useT()`. reason 렌더는 `t('reason.' + item.code, item.params)`. 신뢰도·레짐 타이틀·권리·질문·도움단체 모두 카탈로그.
- 헤더에 EN/ES 토글(두 버튼 또는 셀렉트) — `useLocale().setLocale`.
- `app/layout.tsx`(서버): `cookies()`로 `rr_locale`, 없으면 `headers()`의 `accept-language` → `pickInitialLocale()` → `<html lang={locale}>` + `<LocaleProvider initialLocale={locale}>`. `generateMetadata`로 로케일별 title/description.

### 2.6 카탈로그 키 그룹 (en.json/es.json 동일 구조)
- `page.*` (제목·태그라인·placeholder·버튼·네트워크 에러·토글 라벨)
- `result.*` (섹션 헤더·신뢰도·"Likely:"·cap 라벨·"Not final" 배너·전화)
- `reason.<ReasonCode>` (~20, 일부 `{year}`/`{count}`/`{placeName}`)
- `rights.<Regime>.title` + `rights.<Regime>.points` (포인트는 키별 또는 줄바꿈 구분 — **키별 개별 문자열**: `rights.RSO.point1` 등)
- `question.<QuestionId>.{q,yes,no}`
- `staleness.{pending,pastUpdate,generic}` + `staleness.authority.{lahd,state}`
- `warning.<WarningCode>`, `error.<ErrorCode>`
- `help.title`, `help.<orgKey>.description`
- `disclaimer.text`

---

## 3. 데이터 흐름

1. 서버 `layout`: 쿠키/Accept-Language → 초기 로케일 → `<html lang>` + 메타데이터 + `LocaleProvider`.
2. 사용자가 주소 제출 → `/api/lookup` → **로케일 무관** `LookupResult`(reason/warning 코드 + 파라미터, facts, regime, confidence).
3. 클라 `ResultCard` 등: `useT()`로 모든 코드·키를 활성 로케일 문자열로 렌더.
4. 토글: `setLocale` → 컨텍스트 상태 갱신(즉시 리렌더) + 쿠키 기록. (`<html lang>`은 새로고침 시 갱신 — 허용.)

## 4. 오류 처리 & 엣지케이스

- 카탈로그 키 누락: `translate`가 EN 폴백 → 키 문자열. (테스트가 누락을 사전 차단.)
- reason params 누락 토큰: 치환 안 하고 `{token}` 그대로(가시적이라 디버깅 용이) — 단, 코드-커버리지+엔진 테스트로 정상 경로 보장.
- 쿠키 값 비정상: `pickInitialLocale`이 'en'/'es'만 수용, 그 외 무시.
- Accept-Language 없음/null: 기본 'en'.
- API 에러 코드 미지의 값: 클라가 `error.UPSTREAM_ERROR`(일반) 폴백.

## 5. 테스트 전략 (Vitest)

- **`translate()` 단위:** 키 조회·`{param}` 치환·로케일별·EN 폴백·미존재 키→키 반환.
- **카탈로그 완전성:** `en.json`과 `es.json`의 키 집합 **완전 일치** 단언(양방향 차집합 0).
- **코드 커버리지:** 모든 `ReasonCode`(`reason.<code>`)·`WarningCode`(`warning.<code>`)·`ErrorCode`(`error.<code>`)·`QuestionId`(`question.<id>.{q,yes,no}`)·`Regime`(`rights.<regime>.title`)이 두 카탈로그에 키 존재.
- **`pickInitialLocale()` 단위:** 쿠키 우선 / Accept-Language `es` / 기본 en / 비정상 쿠키 무시.
- **엔진:** reason 코드 단언으로 갱신; 전 스위트 회귀 green(현 47개 유지/조정).
- **수동 검증(dev 서버):** ① 토글 EN↔ES로 결과·근거·get-help·질문 모두 전환 ② `es` Accept-Language로 첫 진입 시 ES ③ 쿠키 영속(새로고침 유지) ④ RSO/AB1482/JCO/콘도/비편입 시나리오의 근거가 ES로 정확.

## 6. 컴포넌트 경계 요약

| 유닛 | 책임 | 의존 |
|---|---|---|
| `translate` | (locale,key,params)→문자열 | catalog |
| `pickInitialLocale` | 쿠키+헤더→Locale | (순수) |
| `LocaleProvider`/`useT`/`useLocale` | 로케일 상태·번역 훅·쿠키 | translate |
| `resolveRegime` (변경) | …→ReasonItem[] | types |
| `rights`/`help` (변경) | 키 기반 콘텐츠 | catalog 키 |
| 컴포넌트/page (변경) | `useT()`로 렌더 + 토글 | LocaleProvider |
| `layout` (변경) | 초기 로케일·lang·메타 | pickInitialLocale |

---

## 7. 향후(이 팩 밖)
- **M2-C:** 공유 링크/저장 (공유 시 로케일 고정 포함 가능).
- **M2-D:** Playwright E2E(언어 전환 흐름 포함) + 컴포넌트 테스트.
- **추가 언어:** KO·HY·ZH — 카탈로그에 로케일 추가 + `Locale` 유니온 확장으로 구조적 지원.
- **병행:** ES 법률 문구 + get-help 데이터 법률단체 검토([[rentrights-gethelp-needs-legal-signoff]]).
