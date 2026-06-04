# RentRights M4-E — Accuracy copy (notice, exemption pairing, safe plain-language)

Date: 2026-06-03
Status: Design (approved direction; pending spec review)

## Context & problem

The persona review (tenant-rights counselor) flagged accuracy/clarity gaps in
the result copy. This sub-project — the last of the M4 UX track — fixes the
clear-cut, low-risk ones. The substantive legal-term rewrites (just cause,
relocation/no-fault, certificate of occupancy, RSO/RSTPO) are deliberately
deferred to the legal-org sign-off track; ES wording for everything here also
gets reviewed there.

Three issues:
1. **Mailed notice +5 days is invisible.** The notice bullet hardcodes
   "30 days (≤10%) or 90 days (>10%)" as a static string — it neither reads from
   `LEGAL.notice` nor shows `mailExtraDays` (5). A renter who got a *mailed*
   notice miscounts their deadline by 5 days. (Math symbols ≤/> are also a
   literacy barrier.)
2. **"Exempt" can read as "no protection."** `reason.SFR_MAYBE_EXEMPT` says a
   single-family/condo "may be exempt from AB 1482 rent caps" without the
   companion fact that citywide Just Cause eviction protection still applies.
3. **"parcel" is assessor jargon** in the unit-count reasons.

## Goal

Single-source the notice figures from `LEGAL.notice` (surfacing the mailed +5
days and dropping ≤/>), pair the SFR exemption with its eviction protection, and
swap the obviously-safe term "parcel" → "property". No new i18n keys (parity
unaffected). No change to legal logic.

Non-goals: the broader jargon rewrite (just cause, relocation, certificate of
occupancy, acronyms) — sign-off track.

## Changes

### 1. Notice bullet from `LEGAL.notice` (`lib/content/rights.ts` + catalogs)
`rightsText()` currently does `points.push(t(`rights.${regime}.point${i}`))`.
Change it to pass notice params (harmless to points that don't use them — the
`translate()` helper only substitutes placeholders it finds):

```ts
const noticeParams = {
  small: LEGAL.notice.smallIncreaseDays,      // 30
  large: LEGAL.notice.largeIncreaseDays,      // 90
  threshold: LEGAL.notice.largeThresholdPct,  // 10
  mail: LEGAL.notice.mailExtraDays,           // 5
};
for (let i = 1; i <= n; i++) points.push(t(`rights.${regime}.point${i}`, noticeParams));
```

(`LEGAL` is already imported in `rights.ts`.)

The three notice strings (`rights.RSO.point4`, `rights.AB1482.point4`,
`rights.JCO_ONLY.point2`) become parameterized — EN:

> "Rent-increase notice: {small} days ({threshold}% or less) or {large} days (more than {threshold}%) — add {mail} days if it came by mail."

ES:

> "Aviso de aumento de renta: {small} días ({threshold}% o menos) o {large} días (más del {threshold}%) — añada {mail} días si llegó por correo."

Result (EN): "Rent-increase notice: 30 days (10% or less) or 90 days (more than
10%) — add 5 days if it came by mail." Every figure now traces to `LEGAL`.

### 2. SFR exemption pairing (`reason.SFR_MAYBE_EXEMPT`, catalogs)
EN:
> "A single-family home or condo may be exempt from the AB 1482 rent cap (if the landlord gave the required notice) — but citywide Just Cause eviction protections still apply."

ES:
> "Una vivienda unifamiliar o condominio podría estar exenta del tope de renta de la AB 1482 (si el arrendador dio el aviso requerido) — pero las protecciones contra el desalojo por causa justa de la ciudad siguen aplicando."

### 3. "parcel" → "property" (catalogs)
- `reason.UNITS_COUNT`: EN "{count} homes on the property" / ES "{count} viviendas en la propiedad"
- `reason.TWO_UNITS`: EN "2 homes on the property" / ES "2 viviendas en la propiedad"
- `reason.SINGLE_UNIT`: EN "Only one home on the property (a single-family house)" / ES "Solo una vivienda en la propiedad (casa unifamiliar)"

## Testing
- **`tests/content/rights.test.ts`**: assert the RSO notice bullet is built from
  `LEGAL.notice` — contains `smallIncreaseDays` (30), `largeIncreaseDays` (90),
  and `mailExtraDays` (5) and the word "mail" (so a hardcoded copy can't silently
  drift). Assert `reason.SFR_MAYBE_EXEMPT` contains "still apply" (pairing) and
  `reason.UNITS_COUNT` renders "homes on the property".
- **i18n parity** stays green (values changed, no keys added/removed).
- Offline `npm test` + `npx tsc --noEmit` + `npm run build` green; Chrome QA
  (EN/ES) of the notice bullet (shows "add 5 days if it came by mail"), the
  exemption reason, and the unit-count reason in the collapsible records.

## Out of scope
Jargon rewrite of just-cause / relocation / certificate-of-occupancy / acronyms,
and the ES final wording sign-off — both on the legal-org sign-off track
(`rentrights-gethelp-needs-legal-signoff`).
