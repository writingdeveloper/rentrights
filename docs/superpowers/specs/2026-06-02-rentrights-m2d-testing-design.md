# RentRights M2-D — Playwright E2E + Component Tests 설계 스펙

- **작성일:** 2026-06-02
- **상태:** 설계안 (사용자 승인 완료, 구현 계획 작성 대기)
- **상위 문서:** `docs/superpowers/specs/2026-06-02-rentrights-design.md` (§12 테스트 전략), M1·M2-A·M2-B·M2-C 완료
- **한 줄 정의:** 그동안 수동으로 QA하던 사용자 흐름을 자동화한다 — **컴포넌트 테스트**(Vitest+RTL+jsdom, 오프라인·결정적)와 **Playwright E2E**(프로덕션 빌드 + 라이브 API, 진짜 end-to-end).

---

## 1. 목표와 범위

지금까지 검증은 Vitest 단위/통합(69개) + 사람이 도는 Claude-in-Chrome QA였다. M2-D는 그 수동 QA를 자동화해 회귀를 코드로 잡는다. 두 층:
- **컴포넌트 테스트** — UI 컴포넌트를 props로 렌더·상호작용 단언(네트워크 무관). `npm test`에 편입.
- **E2E** — 실제 브라우저 + `next start`(프로덕션 빌드) + **라이브 Census/Assessor API**로 전 구간. `npm run e2e`로 분리.

**포함**
1. 컴포넌트 테스트 5개: ResultCard, ConfirmingQuestions, GetHelp, ShareButton, Disclaimer
2. Playwright E2E: 주소→RSO, EN↔ES 토글+쿠키, 에러, 비편입 카운티, 공유 링크 왕복(+언어 고정 링크)
3. 스크립트 분리: `npm test`(오프라인) / `npm run e2e`(라이브)

**제외 (이 팩 밖)**
- CI 워크플로우(GitHub Actions 등) — M3 배포 하드닝과 함께 (라이브-API E2E는 플레이키해 CI 설계 별도 필요)
- 시각 회귀(스냅샷 이미지) 테스트
- 서버 라우트/엔진 재테스트 — 이미 Vitest 통합 테스트가 커버

**비목표**
- 라이브 E2E의 완벽한 무결성: 외부 API는 느리고 간헐 실패 가능 → 재시도 허용·관대한 타임아웃·안정 실측 주소로 완화하되, 결정적 보장은 컴포넌트/단위 테스트의 몫.

---

## 2. 컴포넌트 설계

### 2.1 컴포넌트 테스트 인프라 — Vitest + RTL + jsdom
- **추가 dev 의존성:** `@testing-library/react`, `@testing-library/dom`, `jsdom`.
- **환경:** 기존 `vitest.config.ts`의 `environment: 'node'` 유지. 컴포넌트 테스트 파일은 상단에 `// @vitest-environment jsdom` 프래그마로 파일 단위 jsdom 적용(단위 테스트 속도·격리 불변).
- **렌더 헬퍼:** 각 테스트는 컴포넌트를 `<LocaleProvider>`(기본 en)로 감싸 렌더. RTL `render`/`screen`/`fireEvent`(또는 `userEvent`) 사용.

### 2.2 컴포넌트 테스트 (`tests/components/*.test.tsx`)
- **ResultCard** (`resultcard.test.tsx`): RSO `RegimeResult`(reasons=ReasonItem[], confidence high) 주입 → "Rent Stabilization Ordinance" 제목, 근거 텍스트(예: reason 코드가 영어로 렌더), "High confidence", "up to 3%"(고정 날짜 의존이 있으면 capLabel은 현재 날짜 사용 — 텍스트 존재만 단언하거나 regime 라벨 위주로 단언), "Not final" 배너 렌더; OOJ regime → cap/confidence 영역 미렌더 단언.
- **ConfirmingQuestions** (`confirmingquestions.test.tsx`): `questions=['IS_CONDO']`, `answers={}`, `onAnswer` 스파이 → 질문 문구 렌더; "Yes, a condo" 클릭 → `onAnswer`가 `{ isCondo: true }`로 호출; "No..." 클릭 → `{ isCondo: false }`.
- **GetHelp** (`gethelp.test.tsx`): 기본 → 단체명/전화/Website 링크 렌더, 4개 지정 단체 포함; `unincorporatedCounty` → 첫 카드가 county(DCBA).
- **ShareButton** (`sharebutton.test.tsx`): props(address/answers/locale) → "Copy link" 버튼 + 프라이버시 고지 렌더; `navigator.clipboard.writeText` 목(`vi.fn` resolve) → 클릭 후 "Copied!" 표시 + writeText가 해시(`#a=...`) 포함 URL로 호출됨.
- **Disclaimer** (`disclaimer.test.tsx`): `lastVerified='2026-06-02'` → 고지 문구에 날짜 포함.

### 2.3 E2E 인프라 — Playwright
- **추가 dev 의존성:** `@playwright/test`. 브라우저: `npx playwright install chromium`(크로미움만).
- **`playwright.config.ts`:**
  - `testDir: 'e2e'`
  - `webServer: { command: 'npm run build && npm run start', url: 'http://localhost:3000', timeout: 180_000, reuseExistingServer: true }` — dev 서버 Turbopack이 이 Windows에서 PostCSS 서브프로세스 스폰 실패(0xc0000142)하므로 **프로덕션 서버**로 구동([[rentrights-full-site-chrome-qa]] 참조).
  - `retries: 2`, `workers: 1`(외부 API 과호출·포트 충돌 방지), `timeout: 60_000`(테스트당), `expect: { timeout: 15_000 }`(라이브 결과 대기).
  - `use: { baseURL: 'http://localhost:3000', permissions: ['clipboard-read', 'clipboard-write'] }` — 공유 링크 클립보드를 프롬프트 없이 읽음.
  - `projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }]`.

### 2.4 E2E 스펙 (`e2e/*.spec.ts`, 안정 실측 주소)
- **`lookup.spec.ts`:**
  - `1411 Murray Dr, Los Angeles, CA` 제출 → "Rent Stabilization Ordinance", "High confidence", 근거 "Built in 1931", "6 units" 보임. (**cap %는 날짜 의존**[RSO 3%는 2026-06-30까지, 이후 pending]이므로 정확한 "3%" 값을 단언하지 않음 — "Legal annual increase" 라벨 존재만 확인. 날짜-안정적 단언만 사용.)
  - 가비지(`asdfqwer zxcv nowhere`) → "could not find that address" 에러.
  - `1000 N Eastern Ave, East Los Angeles, CA` → "unincorporated LA County" 문구 + get-help 첫 항목 DCBA.
- **`i18n.spec.ts`:**
  - Murray Dr 결과 상태에서 "Español" 토글 → "Ordenanza de Estabilización de Rentas" 등 스페인어로 전환; 페이지 reload → 여전히 스페인어(쿠키 `rr_locale`).
- **`share.spec.ts`:**
  - Murray Dr 조회 → "Copy link" 클릭 → `navigator.clipboard.readText()`로 링크 획득(권한 부여됨) → 새 page로 그 URL 열기 → 주소 input 복원 + RSO 결과 자동 표시.
  - `baseURL + '/#a=1411+Murray+Dr%2C+Los+Angeles%2C+CA&lang=es'` 직접 열기 → 스페인어 결과 자동 렌더(쿠키와 무관).
- **확인질문:** 라이브 데이터로 질문 유발 주소를 보장하기 어려움 → **ConfirmingQuestions 컴포넌트 테스트(2.2)로 결정적 커버.** 구현 중 안정적 실측 주소(2세대 또는 모호 usecode)를 찾으면 `lookup.spec.ts`에 best-effort 케이스 추가; 못 찾으면 생략하고 사유를 스펙/PR에 명시(무음 누락 금지).

### 2.5 스크립트 & 무시 파일 (`package.json`, `.gitignore`)
- scripts: `"e2e": "playwright test"`, `"e2e:install": "playwright install chromium"`. `"test"`는 그대로(`vitest run` — 컴포넌트 테스트 포함).
- `.gitignore` 추가: `/test-results/`, `/playwright-report/`, `/playwright/.cache/`.

---

## 3. 데이터 흐름 / 실행

- **오프라인 결정적:** `npm test` → Vitest가 node(단위/통합) + jsdom(컴포넌트) 파일을 모두 실행. 네트워크 불필요, 빠름.
- **라이브 E2E:** `npm run e2e` → Playwright가 `next build && next start`로 프로덕션 서버 기동 → chromium으로 실제 사용자 흐름 수행 → 라이브 Census/Assessor 응답으로 결과 검증. 재시도·관대한 타임아웃.

## 4. 오류 처리 & 엣지케이스

- 외부 API 지연/간헐 실패 → `retries: 2` + `expect timeout 15s`. 계속 실패하면 네트워크/외부 API 이슈로 보고(코드 결함과 구분).
- 첫 빌드 시간 → webServer `timeout: 180s`.
- 포트 3000 점유 → `reuseExistingServer: true`(로컬 반복 시 기존 서버 재사용). 별도 점유 프로세스는 사람이 정리.
- 클립보드 권한 → context permissions로 부여(프롬프트로 멈추지 않음).
- jsdom에 없는 브라우저 API(예: `navigator.clipboard`, `navigator.share`) → 컴포넌트 테스트에서 `vi.stubGlobal`/목으로 주입.

## 5. 테스트 전략 (자기참조)

- 이 팩 자체가 테스트 인프라. 검증:
  - `npm test` → 기존 69 + 신규 컴포넌트 테스트 전부 green.
  - `npm run e2e` → Playwright 스위트 green(라이브). 최소 1회 실제 실행으로 확인.
  - `npx tsc --noEmit` clean, `npm run build` 성공.
  - **표준 전체 사이트 Claude-in-Chrome QA**는 이 팩이 UI를 바꾸지 않으므로 스모크 수준(서버 기동·메인 흐름 1회)만 — E2E가 그 흐름을 자동화하므로 중복 최소화.

## 6. 컴포넌트 경계 요약

| 유닛 | 책임 | 의존 |
|---|---|---|
| `tests/components/*` | 컴포넌트 렌더·상호작용 단언 (jsdom) | RTL, LocaleProvider |
| `playwright.config.ts` | E2E 러너 설정(프로덕션 서버·재시도·권한) | @playwright/test |
| `e2e/*.spec.ts` | 라이브 사용자 흐름 자동화 | 실행 중인 프로덕션 서버 |
| `package.json`/`.gitignore` | 명령 분리·산출물 무시 | — |

---

## 7. 향후(이 팩 밖)
- **M3:** CI 워크플로우(오프라인 `npm test`는 PR 게이트, 라이브 `e2e`는 nightly/수동), County RSTPO 판별, 임대료 인상 합법성 체커, 배포 하드닝(Docker + NPM 프록시).
- **병행:** ES 법률 문구 + get-help 데이터 법률단체 검토([[rentrights-gethelp-needs-legal-signoff]]).
