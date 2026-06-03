# RentRights M4-B — Address autocomplete

Date: 2026-06-03
Status: Design (approved direction; pending spec review)

## Context & problem

The address box is free text with no suggestions, and a city is required (the
Census geocoder can't locate a street without one). Stressed/ESL renters type
just a street and hit a dead-end "couldn't find that address" error — the
persona review's #1 abandonment point. We deliberately do NOT auto-assume "Los
Angeles" (a street name often exists in several LA-area cities, so assuming
would misclassify a renter who lives elsewhere — see the real/accurate-data
constraint).

LA County's official **CAMS_Locator** GeocodeServer supports a `Suggest`
operation. Typing "300 s santa fe" returns full addresses *with their city* and
disambiguated across cities:

- 300 South Santa Fe Avenue, **Los Angeles**, CA
- 300 South Santa Fe Avenue, **Long Beach**, CA
- 300 South Santa Fe Avenue, **Huntington Park**, CA …

So the renter picks their actual address (city included) — eliminating the
missing-city dead-end without any unsafe assumption.

## Goal

Add address autocomplete to the home input: as the renter types, show CAMS
suggestions (with city); selecting one runs the lookup with the full address.
Free-text submit still works (and still shows the improved not-found error when
a city is missing).

Non-goals (separate sub-projects): result readability/loading (M4-C),
site-wide accessibility (M4-D), copy accuracy (M4-E). This sub-project does add
proper a11y to the new autocomplete widget itself (it's new code).

## Architecture

Three small units + two wiring changes:

1. **`lib/clients/cams.ts` — `fetchSuggestions(text, fetch)`** (+ pure
   `parseSuggestions(json)`). Calls
   `…/CAMS_Locator/GeocodeServer/suggest?text=<text>&maxSuggestions=5&f=json`
   and returns `string[]` of suggestion labels (the `suggestions[].text`
   values, e.g. "300 South Santa Fe Avenue, Los Angeles, CA"). We use the label
   text only — no `magicKey` — because the existing lookup re-geocodes the full
   address (Census for jurisdiction + CAMS for the parcel), and the label
   already contains the city.

2. **`app/api/suggest/route.ts` — `GET ?q=`** (server proxy, runtime nodejs).
   Trims `q`; if `< 4` chars returns `{ suggestions: [] }` (no upstream call).
   Otherwise calls `fetchSuggestions`, returns `{ suggestions: string[] }`
   (already capped at 5). Any upstream error → `{ suggestions: [] }` with 200
   (typing must never surface an error). A server route (not a direct client
   call) keeps the external dependency server-side and avoids CORS surprises,
   matching the existing `/api/lookup` pattern.

3. **`components/AddressAutocomplete.tsx`** (client) — a controlled combobox.
   Props: `{ value, onChange(text), onSelect(fullAddress), onSubmit() }`.
   - On `value` change (when focused), debounce ~250ms; if `value.trim().length
     >= 4`, `GET /api/suggest?q=`; store results; open the dropdown.
   - Renders the input (existing styling) and, when open and non-empty, a
     dropdown `<ul role="listbox">` of `<li role="option">` items. A loading row
     ("suggest.loading") shows while a request is in flight; an empty row
     ("suggest.none") shows when a settled query returned nothing.
   - **Select** (click or Enter on the active item): call `onChange(full)` then
     `onSelect(full)`, close the dropdown. (`onSelect` triggers the lookup in
     the parent.)
   - **Keyboard:** ArrowDown/ArrowUp move the active option (`aria-activedescendant`),
     Enter selects the active option (or submits the form if none active), Escape
     closes the dropdown. Blur closes after a short delay so a click can land.
   - **ARIA:** input `role="combobox"`, `aria-expanded`, `aria-controls`,
     `aria-autocomplete="list"`; list `role="listbox"`; items `role="option"`
     with `aria-selected`. Tap targets ≥44px.

4. **`app/page.tsx`** — replace the raw `<input>` inside the existing `<form>`
   with `<AddressAutocomplete value={address} onChange={setAddress}
   onSelect={(full) => { setAnswers({}); run(full, {}); }} onSubmit={() => {
   setAnswers({}); run(address, {}); }} />`. The form's existing submit still
   handles free-text Enter/Check.

5. **i18n** (`messages/en.json` + `es.json`): `suggest.loading`
   ("Looking up addresses…" / "Buscando direcciones…"), `suggest.none` ("No
   matching address — try including the city" / "No hay direcciones
   coincidentes — intente incluir la ciudad"). Reuse `page.placeholder`.

## Data flow

type → AddressAutocomplete (debounced) → `GET /api/suggest?q=` → `fetchSuggestions`
→ CAMS `/suggest` → labels → dropdown. Select → `onSelect(full)` → parent
`run(full, {})` → existing `POST /api/lookup` (Census jurisdiction + CAMS
parcel). Free-text Check → existing path unchanged.

## Error / edge handling

- `< 4` chars, or whitespace-only: no request, dropdown closed.
- Upstream/network error in `/api/suggest`: returns empty list, 200 — typing
  is never interrupted; the user can still free-text submit.
- Stale responses: each fetch remembers the `q` it was issued for; when it
  resolves, the component ignores it unless `q` still equals the current trimmed
  input. (Simple equality guard — no AbortController needed.)
- Selecting a non-LA-City address (e.g. Long Beach) → the normal lookup returns
  OUT_OF_JURISDICTION, which the result UI already handles.

## Testing

- **`tests/clients/cams.test.ts`**: `parseSuggestions` extracts the `text`
  list (and tolerates missing/`error` payloads → `[]`); `fetchSuggestions`
  builds the right URL via injected fetch and returns the labels.
- **Route guard**: keep the `q < 4` and error-to-empty logic in a tiny pure
  helper (e.g. `shouldQuery(q)` and a try/catch returning `[]`) so it's covered
  by the client tests; do NOT write an offline test that invokes the route
  handler directly (it would hit the live CAMS endpoint via global `fetch`). The
  route's end-to-end behavior is covered by Chrome QA.
- **`tests/components/addressautocomplete.test.tsx`** (jsdom): typing ≥4 chars
  (mocked `fetch`) renders suggestions; clicking a suggestion calls `onSelect`
  with the full label; ArrowDown+Enter selects the active option; Escape closes;
  `< 4` chars shows no dropdown.
- **i18n** parity stays green.
- Offline `npm test` + `npx tsc --noEmit` + `npm run build` green; full-site
  Chrome QA of the typing→suggest→select→result flow per the standing QA
  constraint (incl. EN/ES).

## Out of scope
Result/loading redesign (M4-C), site-wide a11y/contrast/`tel:` (M4-D), accuracy
copy (M4-E). The not-found error copy stays as-is (already improved in an
earlier fix).
