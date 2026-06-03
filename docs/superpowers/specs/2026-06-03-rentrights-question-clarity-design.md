# RentRights M4-A — Confirming-question clarity + "I'm not sure"

Date: 2026-06-03
Status: Design (approved direction; pending spec review)

## Context & problem

When the Assessor lookup can't return parcel facts (common for large/new
buildings, ground-lease parcels, or points off the parcel polygon), the engine
asks the renter confirming questions. A three-persona review (senior UX
designer, a layperson renter "Maria", and a tenant-rights / plain-language
counselor) of the live service found the questions are the #1 barrier:

- **Jargon laypeople don't understand:** "certificate of occupancy", "ADU",
  "individually-owned condominium", "AB 1482 exemption notice". The layperson
  persona nearly abandoned the tool at the first question.
- **No "I'm not sure":** renters genuinely don't know their building's year,
  unit type, or whether they got an exemption notice. Forcing yes/no produces
  confidently-wrong legal results — the worst outcome for this audience.
- **Unsafe defaults / inverted framing:** the condo question ("Is this an
  individually-owned condominium (not a rental apartment)?") is a double
  negative; an unsure renter might pick "condo" and lose their AB 1482 rent-cap
  protection.

This sub-project (M4-A) fixes **only the confirming questions**. Address-input
UX (M4-B), result readability/trust (M4-C), accessibility sweep (M4-D), and
broader accuracy copy like the mailed-notice +5 days (M4-E) are tracked
separately and are out of scope here.

## Goals

1. Rewrite all four confirming questions in plain language with a one-line
   helper + concrete example, in EN and ES (ES uses the words renters actually
   use: *casita / casa de atrás*, *condominio que alguien compró*).
2. Add an **"I'm not sure"** option to every question that resolves to the
   **most protective** interpretation (never re-asks, never blocks).
3. Put the safe / most-common answer **first** and visually emphasized; stack
   answers vertically with large tap targets (mobile-first).
4. Stay **honest**: when an answer was assumed because the user was unsure, the
   result says so ("we used the most protective option") rather than claiming
   "you said …".

Non-goals: changing the legal logic of regime determination, changing parcel
lookup, redesigning the result card, address input, or the get-help section.

## Final copy (user-facing, EN)

Helpers shown as a muted line under the question; safe answer first + green
emphasis; "I'm not sure" as a tertiary (dashed) button.

**Q1 — Building age** (`BUILT_BEFORE_OCT_1978`)
- Q: "Is your building older — finished before October 1978?"
- Help: "Older buildings usually get LA's strongest rent protections (RSO). Not sure of the exact year? That's normal — pick *I'm not sure* and we'll stay on the protective side."
- Buttons: `Yes — before Oct 1978` · `No — newer than that` · `I'm not sure`

**Q2 — Building form** (`IS_SEPARATE_HOUSE`, reframed)
- Q: "Is your home part of a building with other units — or a single stand-alone house?"
- Help: "Apartment buildings and duplexes are 'a building with other units.' A back house, casita, or ADU counts as a single house. Not sure? Pick the first one."
- Buttons: `A building with other units · most common` · `A single stand-alone house` · `I'm not sure`

**Q3 — Condo vs rental apartment** (`IS_CONDO`)
- Q: "Is your home a rental apartment, or a condo someone owns?"
- Help: "A *condo* is a unit someone **bought** (you'd rent from that individual person). A *rental apartment* is part of a building run by one landlord or company. Most renters: rental apartment. Not sure? Pick rental apartment."
- Buttons: `Rental apartment · most common` · `A condo someone owns` · `I'm not sure`

**Q4 — AB 1482 exemption notice** (`AB1482_EXEMPTION_NOTICE`)
- Q: "Did your landlord give you a written notice saying your home is NOT covered by California's rent-cap law?"
- Help: "A specific signed paper (it may say 'exempt' or mention 'AB 1482'), usually given when you sign your lease. Most renters never got one. Don't remember? Pick No."
- Buttons: `No / I never got one · most common` · `Yes — I got that notice` · `I'm not sure`

ES mirrors these (authored in plain Spanish, not literal translation; reviewed
later in the legal-org sign-off track). Heading stays "A couple of quick
questions to improve accuracy:" / existing ES.

## "I'm not sure" semantics — protective defaults

"I'm not sure" must stop the question from being re-asked and apply the
most-protective interpretation, while the result honestly flags the assumption.

| Question | Explicit answers | "I'm not sure" → assume | Why protective |
|---|---|---|---|
| Q1 age | before / after Oct 1978 | **age unknown** (leave null) | unknown age + multi-unit already leans RSO (pending confirm) |
| Q2 form | multi-unit / single house | **multi-unit** | multi-unit keeps RSO/AB 1482 rent caps in play |
| Q3 condo | rental apt / condo | **rental apartment** (not condo) | keeps the AB 1482 rent cap |
| Q4 exemption | No / Yes | **No exemption** | keeps AB 1482 protections |

### Data model

`QuestionId` and `UserAnswers` boolean fields are unchanged. Add a single
optional field recording which questions the user explicitly marked unsure:

```ts
export interface UserAnswers {
  builtBeforeOct1978?: boolean;
  isSeparateHouse?: boolean;
  hasAb1482ExemptionNotice?: boolean;
  isCondo?: boolean;
  unsure?: QuestionId[]; // questions the user answered "I'm not sure"
}
```

`unsure` survives the share link (add to the URL codec) so a shared result
reproduces. **"I'm not sure" sets no boolean** — it only adds the `QuestionId`
to `unsure`. The engine reads the `unsure` list at each decision (uniform
across all four questions; no per-question protective boolean to keep in sync).

### Engine behavior (`resolveRegime`, both City and County paths)

For each decision point, the "ask the question" gate gains an `unsure` escape,
and an unsure entry applies the protective interpretation with an *assumed*
reason instead of a *said* reason:

- **Age:** ask `BUILT_BEFORE_OCT_1978` only when `builtBeforeOct1978 === undefined && !unsure.includes('BUILT_BEFORE_OCT_1978') && yearBuilt == null`. If unsure → `builtBefore = null` and push reason `ASSUMED_BUILD_UNKNOWN` (then the existing null-age decision applies).
- **Form:** ask `IS_SEPARATE_HOUSE` only when not answered, not unsure, and `units == null`. If `isSeparateHouse === false` → multi-unit (`SAID_NOT_SEPARATE_HOUSE`, existing). If unsure → multi-unit + reason `ASSUMED_MULTIUNIT`.
- **Condo:** the condo follow-up (`IS_CONDO`) is asked when multi-unit and use-code isn't clearly "apartment" and not answered and `!unsure.includes('IS_CONDO')`. If unsure → treat as **not** a condo (no effect on multiUnit) + reason `ASSUMED_NOT_CONDO`; do not re-ask.
- **Exemption:** ask `AB1482_EXEMPTION_NOTICE` for single-family/condo when not answered & `!unsure.includes('AB1482_EXEMPTION_NOTICE')`. If unsure → treat as no notice → AB 1482 applies + reason `ASSUMED_NO_EXEMPTION`.

Each decision reads only the `unsure` list for its protective interpretation;
no boolean is set by "I'm not sure".

New reason codes (added to `ReasonCode`, `ALL_REASON_CODES`, and both
catalogs): `ASSUMED_BUILD_UNKNOWN`, `ASSUMED_MULTIUNIT`, `ASSUMED_NOT_CONDO`,
`ASSUMED_NO_EXEMPTION`. Suggested copy (EN):
- ASSUMED_BUILD_UNKNOWN: "You weren't sure of the build date, so we left it open and stayed on the protective side."
- ASSUMED_MULTIUNIT: "You weren't sure, so we assumed a building with other units (keeps more protections)."
- ASSUMED_NOT_CONDO: "You weren't sure, so we assumed a regular rental apartment (keeps the rent cap in play)."
- ASSUMED_NO_EXEMPTION: "You weren't sure about an exemption notice, so we assumed none — confirm with LAHD."

## Component (`components/ConfirmingQuestions.tsx`)

- Each question renders: question text, a muted helper line, then vertical
  buttons in this order: **safe/common answer (emphasized)**, the other answer,
  then **"I'm not sure"** (tertiary/dashed).
- A new `QUESTION_META` shape maps each `QuestionId` to: the safe answer's
  `{key, value}`, the other answer's `{key, value}`, and the i18n key stems for
  `q` / `help` / the three button labels.
- "I'm not sure" click: add the `QuestionId` to `answers.unsure` and set **no**
  boolean (uniform for all four; the engine derives the protective default from
  the `unsure` list).
- Buttons must be ≥44px tall with adequate spacing (mobile tap targets). Full
  contrast/ARIA pass is M4-D; this sub-project just adopts the vertical
  large-target layout.

New i18n keys per question: `question.<ID>.help` and
`question.<ID>.unsure` (plus updated `.q/.yes/.no`). Catalog parity test keeps
EN/ES in sync.

## Testing

- **Engine unit tests** (`tests/rules/engine.test.ts`): for each question,
  `unsure: [ID]` with null facts → resolves (no question re-asked) to the
  protective regime and emits the matching `ASSUMED_*` reason. Locked expected
  outcomes: all four unsure + LA city → **RSO, medium** (multi-unit + age
  unknown leans RSO via `MULTIUNIT_BUILDDATE_UNCERTAIN`), with reasons including
  `ASSUMED_MULTIUNIT` and `ASSUMED_BUILD_UNKNOWN`, and `questions === []`. Q4
  exemption-unsure only changes the outcome on the single-family path (age
  known-after-1978 + single house + exemption unsure → AB 1482). County path:
  all unsure → `COUNTY_RSTPO, medium`.
- **Component test** (`tests/components/confirmingquestions.test.tsx`): renders
  the help line and three buttons per question; clicking "I'm not sure" calls
  `onAnswer` with the protective value and the `unsure` entry.
- **Catalog**: parity (EN/ES identical keys) + reason-code coverage includes the
  four new `ASSUMED_*` codes.
- **Share codec**: round-trips `unsure`.
- Offline `npm test` + `tsc --noEmit` green; full-site Chrome QA of the
  unsure-path flow per the standing QA constraint.

## Out of scope (separate sub-projects)

M4-B address input · M4-C result readability/trust & loading state · M4-D
accessibility/contrast/`tel:` · M4-E accuracy copy (mailed +5 days,
"exempt but still protected" pairing, plain-language reason/rights rewrites).
The ES wording here joins the existing legal-org sign-off track before launch.
