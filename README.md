# RentRights — know your LA renter rights from your address

**Live:** https://rentrights.writingdeveloper.blog · **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Vitest/Playwright · Vercel

RentRights turns a Los Angeles street address into an **honest, sourced estimate**
of which rent law protects the tenant — the City of LA **Rent Stabilization
Ordinance (RSO)**, California's **AB 1482**, LA County's **RSTPO**, or
just-cause-only — plus the current legal rent-increase cap, a rent-increase
**legality checker**, and the renter's key protections. Free, **bilingual
(English/Spanish)**, no sign-up, nothing stored.

It's a real tool for a real audience (millions of LA renters), built to be
*correct and honest about uncertainty* rather than confidently wrong.

> It's an estimate from public records, **not legal advice** — the UI says so and
> routes every renter to LAHD / DCBA / free legal aid to confirm.

---

## Try it (reviewer's guide)

Open the [live site](https://rentrights.writingdeveloper.blog) and enter:

| Address | What it demonstrates |
|---|---|
| `1411 Murray Dr, Los Angeles` | **RSO** — pre-1978 multi-unit, cap "up to 3%", high confidence, real parcel facts (built 1931, 6 units) |
| `8800 Sunset Blvd, West Hollywood` | **AB 1482** — incorporated city ≠ LA City, routed to the state baseline |
| `2424 Fair Oaks Ave, Altadena` | **LA County RSTPO/JCO** — unincorporated area detected from Census data |
| any single-family home | **AB 1482 + a confirming question** (exemption notice) — the "we need a little more info" path |

Then try the **rent-increase checker** (e.g. current 2000 → proposed 2200 shows
"over the legal cap, max ≈ $2,060"), switch to **/es** for Spanish, and open
"See the records behind this estimate" to view the public data the verdict is
built from.

---

## Why it's interesting (engineering highlights)

- **A real public-records pipeline, not a mock.** An address resolves through LA
  County's own stack: CAMS rooftop geocoder → Assessor parcels (point-in-polygon →
  AIN) → assessment roll (year built, units, use code), with the US Census
  geocoder for jurisdiction. Results are cross-verified against the authoritative
  county roll — the numbers you see are the county's, not hardcoded.

- **A performance problem solved with domain insight.** The Assessor roll's `AIN`
  column is *unindexed* upstream, so filtering by it full-scans ~2.4M rows
  (measured 13–55s). Re-querying through the **indexed situs fields** (ZIP +
  house number) and selecting the matching AIN client-side drops it to ~1s.
  Every upstream call is wrapped in an `AbortController` timeout so a slow county
  API **degrades to confirming-questions instead of hanging**.

- **A four-regime rules engine** (`lib/rules/engine.ts`) that derives
  RSO / AB 1482 / County / just-cause from parcel facts + tenant answers, with a
  deliberate **protective-direction bias**: when uncertain, it leans toward the
  protection a renter likely has rather than asserting "you're exempt."

- **Honest about uncertainty by design.** Incomplete records produce a confidence
  level + targeted confirming questions (each with a safe "I'm not sure" default
  that picks the most protective assumption) — never fabricated facts. Legal
  figures are **dated constants with effective dates** that auto-degrade to
  "pending — confirm with LAHD" when a period lapses, so the tool is never
  *confidently wrong* even if left unmaintained.

- **Bilingual + discoverable.** Full EN/ES catalogs with a crawlable `/es` route
  (proxy-rewritten, hreflang cluster) so Spanish content is indexable; JSON-LD,
  sitemap/robots (welcoming AI crawlers), and `llms.txt` for GEO/AI search.

- **Accessible and fast.** WCAG AA verified in **both light and dark** schemes
  (every token pair ≥ 4.5:1), keyboard nav, ARIA combobox, ≥44px targets;
  PageSpeed Insights **100/100/100/100** with green Core Web Vitals.

- **Production hygiene.** Content-Security-Policy + HSTS + security headers,
  in-app rate limiting (defense-in-depth behind a Vercel Firewall rule), branded
  bilingual 404 + error boundaries, and a privacy posture that stores nothing.

## Quality

- **222 unit tests** (Vitest) + Playwright e2e; CI runs typecheck → lint → test →
  build on every push and PR (`.github/workflows/ci.yml`), green on `master`.
- **Data accuracy verified** against the live LA County Assessor roll (not just
  "it returns something").
- **0 open security alerts** (Dependabot), 0 `npm audit` vulnerabilities.

## Architecture

```
address ─▶ /api/lookup ─▶ lib/compute/lookup.ts
                            ├─ Census geocoder ........ jurisdiction (city / county / OOJ)
                            ├─ CAMS + Assessor ........ parcel facts (year, units, use code)
                            └─ lib/rules/engine.ts .... regime + confidence + reasons + questions
                                  └─ lib/legal/constants.ts (dated, effective-dated legal figures)
```

Result rendering is answer-first: verdict → (confirming questions, if any) →
increase checker → what-to-do → eviction help → org directory → evidence →
disclaimer. Design specs and implementation plans live in
`docs/superpowers/{specs,plans}/`.

## Develop

```sh
npm install
npm run dev      # http://localhost:3000
npm test         # vitest (offline)
npm run e2e      # playwright (hits live county/Census APIs)
```

> ⚠️ This is not the Next.js you may know — it targets Next 16 (App Router, the
> `proxy` convention that replaced `middleware`). See `AGENTS.md`.

## Deploy

Production runs on **Vercel** (native Next.js). Push to `master` auto-deploys; or
`vercel --prod`.

- `NEXT_PUBLIC_SITE_URL` is **build-time** (inlined by `next build`); the
  committed `.env.production` pins the production origin, and a build that would
  resolve to `localhost` fails fast (`lib/seo/site-url.ts`).
- Runtime vars (`UPSTREAM_TIMEOUT_MS`, `GOOGLE_/BING_SITE_VERIFICATION`) live in
  the Vercel project env. Analytics is cookieless Vercel Web Analytics.
- A Docker self-host alternative is archived in `deploy/docker/`.

## Maintaining the legal data

Legal figures live in one dated file, `lib/legal/constants.ts`, each with a
`source` and `effectiveFrom`/`effectiveTo`. **Cadence:** RSO % (~Jul 1),
AB 1482 % (~Aug 1), County % + relocation (~Jul 1). Edit the figure → `npm test`
→ bump `CONTENT_LAST_UPDATED` if home/FAQ copy changed → push. Until a new figure
is published the UI shows an honest "pending — confirm with LAHD" banner rather
than a stale number.

## Disclaimer

RentRights provides **general legal information, not legal advice**, and an
*estimate* from public records — not a lookup from LAHD's official registry.
Renters are always routed to LAHD, LA County DCBA, or free legal aid to confirm.

## License

[MIT](LICENSE) — free to use, adapt, and build on.
