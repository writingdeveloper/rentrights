# RentRights M2-C — 공유 링크/저장 설계 스펙

- **작성일:** 2026-06-02
- **상태:** 설계안 (사용자 승인 완료, 구현 계획 작성 대기)
- **상위 문서:** `docs/superpowers/specs/2026-06-02-rentrights-design.md` (§15.2: SMS 대신 공유 링크/저장으로 확정 — 전화번호 PII 회피), M1·M2-A·M2-B 완료
- **한 줄 정의:** 사용자가 현재 결과를 **링크 하나로 공유/저장**할 수 있게 한다. 링크는 입력값(주소·확인질문 답변·언어)을 **URL 해시에 인코딩**하고, 수신자가 열면 앱이 재조회해 동일 결과를 보여준다. 서버 저장·계정·DB 없음.

---

## 1. 목표와 범위

M2-B까지 결과는 휘발성(요청 시 계산, 저장 안 함)이다. M2-C는 결과를 **공유 가능·재방문 가능**하게 만들되, 무상태·PII 비저장 원칙(spec §8, §15.2)을 지킨다. 방법: 입력값을 URL **해시 프래그먼트**에 인코딩 → 로드 시 디코드 후 자동 재조회.

**포함**
1. 순수 공유 코덱 `encodeShare`/`decodeShare` (입력값 ↔ 해시 문자열)
2. 공유 버튼 컴포넌트: Web Share API(지원 시) → 클립보드 복사 폴백 → 링크 텍스트 노출(최종 폴백) + "복사됨" 피드백 + 프라이버시 고지
3. 페이지 로드 시 해시에서 상태 복원 + 자동 재조회 + 언어 복원
4. 공유 관련 i18n 카탈로그 키(en/es)
5. **표준 검증:** Claude in Chrome 전체 사이트 순차 QA([[rentrights-full-site-chrome-qa]])

**제외 (이 팩 밖)**
- 서버 저장/단축 URL/계정 (무DB·PII 비저장 원칙)
- 결과 스냅샷 인코딩(재조회 대신 결과 박제) — 재조회 방식이 항상 최신·정직한 추정 유지
- 경로 기반 `/[locale]` 라우팅, Playwright E2E (M2-D)
- URL 자동 동기화(매 조회마다 주소창 갱신) — 버튼 클릭 시점에만 링크 생성(YAGNI)

**비목표**
- 링크가 주소를 숨기는 것: 공유 링크는 본질적으로 공유 대상(주소의 권리 정보)을 드러낸다. 사용자가 명시적으로 공유를 누를 때만 생성하고, 해시 프래그먼트(서버 미전송)로 노출을 최소화하며, 버튼 옆에 "링크에 주소 포함" 고지를 둔다.

---

## 2. 컴포넌트 설계 (단일 책임·독립 테스트)

### 2.1 공유 코덱 — `lib/share/code.ts` (순수)

```
import { UserAnswers } from '@/lib/rules/types';
import { Locale } from '@/lib/i18n/catalog';

export interface ShareState {
  address: string;
  answers: UserAnswers;
  locale?: Locale;
}

export function encodeShare(s: ShareState): string;     // '#' 없는 해시 문자열 반환
export function decodeShare(hash: string): ShareState | null;
```

- **encodeShare:** `URLSearchParams`로 빌드.
  - `a` = `address`(필수).
  - `lang` = `locale`(있을 때만, `en|es`).
  - 확인질문 답변(set된 것만): `b`=`builtBeforeOct1978`, `s`=`isSeparateHouse`, `e`=`hasAb1482ExemptionNotice`, `c`=`isCondo` → 각각 `1`(true)/`0`(false). `undefined`인 답변은 생략.
  - 반환: `params.toString()` (예: `a=1411+Murray+Dr%2C+Los+Angeles&lang=es&b=1&c=0`).
- **decodeShare:** 선행 `#` 있으면 제거 후 `URLSearchParams` 파싱.
  - `a`(주소) 없거나 공백뿐이면 `null`.
  - `lang`은 `'en'|'es'`만 채택(그 외 무시).
  - `b/s/e/c`는 `'1'→true`, `'0'→false`, 그 외 키 누락(해당 답변 미설정).
  - 반환 `{ address, answers, locale? }`.
- 순수·양방향. URLSearchParams가 콤마/공백/유니코드 인코딩을 처리.

### 2.2 공유 버튼 — `components/ShareButton.tsx` (`'use client'`)

```
export function ShareButton({ address, answers, locale }: {
  address: string; answers: UserAnswers; locale: Locale;
}): JSX.Element
```

- 링크 빌드: `const url = `${window.location.origin}${window.location.pathname}#${encodeShare({ address, answers, locale })}`;` (클릭 시점에 계산 — SSR 안전).
- 클릭 동작(순서):
  1. `navigator.share`가 함수면 `await navigator.share({ title: t('share.shareTitle'), url })`. (사용자 취소(AbortError)는 조용히 무시.)
  2. 아니면 `navigator.clipboard?.writeText(url)` → 성공 시 `copied` 상태 true(2초 후 false).
  3. 둘 다 불가/실패 → `copied` 대신 링크를 읽기전용 `<input>`로 노출(수동 복사).
- 렌더: 버튼 라벨 `copied ? t('share.copied') : t('share.button')`; 버튼 아래 `<p>`에 `t('share.privacyNote')` (작은 회색 텍스트).
- `useT()` 사용.

### 2.3 페이지 통합 — `app/page.tsx`

- **로드 복원(`useEffect`, 마운트 1회):**
  - `const s = decodeShare(window.location.hash);`
  - `s`가 있으면: `setAddress(s.address)`; `setAnswers(s.answers)`; `s.locale && s.locale !== locale && setLocale(s.locale)`; `run(s.address, s.answers)`.
  - 해시 없음/무효 → 아무 것도 안 함(기존 빈 화면).
  - 의존성: 마운트 시 1회(빈 deps). `run`/`setLocale`는 안정 참조거나 eslint-friendly하게 처리(필요 시 함수 내부에서 최신값 사용).
- **공유 버튼 렌더:** `data`가 있을 때 결과 영역(예: `GetHelp` 위 또는 `Disclaimer` 위)에 `<ShareButton address={address} answers={answers} locale={locale} />`.

### 2.4 i18n 카탈로그 — `messages/en.json`, `messages/es.json`
- 추가 키(en/es 동일 집합):
  - `share.button` — EN "Copy link" / ES "Copiar enlace"
  - `share.copied` — EN "Copied!" / ES "¡Copiado!"
  - `share.privacyNote` — EN "This link includes the address you entered." / ES "Este enlace incluye la dirección que ingresó."
  - `share.shareTitle` — EN "My LA renter-rights estimate" / ES "Mi estimación de derechos de inquilino en LA"
- 기존 카탈로그 완전성 테스트(en 키 집합 == es 키 집합)가 누락/불일치를 차단.

---

## 3. 데이터 흐름

1. 사용자가 결과를 본 뒤 공유 버튼 클릭 → `encodeShare`로 현재 `{address, answers, locale}`를 해시 링크로 생성 → 네이티브 공유 또는 클립보드 복사.
2. 수신자가 링크를 열면 → 페이지 마운트 `useEffect`가 `decodeShare(location.hash)` → 상태 복원 + `setLocale` + `run()` 자동 호출 → `/api/lookup` 재조회 → 동일(최신) 결과 렌더.
3. 서버·DB 미관여. 해시는 서버로 전송되지 않음.

## 4. 오류 처리 & 엣지케이스

- 무효/빈 해시 → `decodeShare`가 `null` → 정상 빈 화면.
- 주소만 있고 답변 없음 → `run(address, {})`.
- `lang`이 비정상 값 → 무시(현재 로케일 유지).
- `navigator.share` 사용자 취소 → 조용히 무시(에러 표시 안 함).
- `navigator.clipboard` 미지원/비보안 컨텍스트 → 링크 텍스트 노출 폴백. (localhost·https는 보안 컨텍스트라 clipboard 동작.)
- 공유 링크의 주소가 더 이상 조회 안 됨 → 기존 "주소 미발견" 에러 경로(로케일화된 `error.ADDRESS_NOT_FOUND`).
- 외부 API 장애 → 기존 폴백(질문 경로/`warning` 코드).

## 5. 테스트 전략

- **Vitest 단위 (`tests/share/code.test.ts`):**
  - 라운드트립: `decodeShare('#' + encodeShare(s))` === `s` (주소에 콤마·공백·유니코드 포함; 답변 부분집합; locale 유/무).
  - `decodeShare('')` / 주소 없는 해시 → `null`.
  - `lang=fr`(비정상) → locale 미설정.
  - `b=1&c=0` → `{ builtBeforeOct1978: true, isCondo: false }` (s/e 미설정).
  - 선행 `#` 유무 모두 처리.
- **카탈로그 완전성/커버리지 회귀:** 기존 i18n 테스트 green(share.* 키 en/es 동수).
- **Claude in Chrome 전체 사이트 순차 QA (필수, [[rentrights-full-site-chrome-qa]]):** 신규 dev 서버 + 새 탭으로 사용자 입장 순차 검증, 각 단계 스크린샷:
  1. 주소 입력 → RSO 결과(예: 1411 Murray Dr)
  2. 확인질문 흐름(콘도/별채 트리거 주소)
  3. 비편입 카운티(East LA류) 안내
  4. 주소 미발견 에러(로케일화)
  5. EN↔ES 토글 즉시 전환 + 새로고침 쿠키 유지
  6. get-help 디렉터리 렌더(이름/전화/링크)
  7. **공유: 결과에서 링크 복사 → 새 탭에서 해당 해시 링크 열기 → 주소·답변·언어가 복원되고 동일 결과 자동 표시**
  8. 프라이버시 고지 노출 확인
- Playwright E2E 자동화는 M2-D.

## 6. 컴포넌트 경계 요약

| 유닛 | 책임 | 의존 |
|---|---|---|
| `encodeShare`/`decodeShare` | 입력값 ↔ 해시 문자열 | types, catalog(Locale) |
| `ShareButton` | 링크 생성·공유/복사·고지 렌더 | code, useT |
| `app/page.tsx`(변경) | 로드 복원 + 버튼 렌더 | code, ShareButton |
| 카탈로그(추가) | share.* 문구 | — |

---

## 7. 향후(이 팩 밖)
- **M2-D:** Playwright E2E(공유 링크 왕복 포함) + 컴포넌트 테스트.
- **M3:** County RSTPO 실제 판별, 임대료 인상 합법성 체커, 배포 하드닝.
- **병행:** ES 법률 문구 + get-help 데이터 법률단체 검토([[rentrights-gethelp-needs-legal-signoff]]).
