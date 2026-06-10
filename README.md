# RentRights (M1)

Free, open-source tool: enter a **City of Los Angeles** address and get an *honest estimate* of your rent regime (RSO / AB 1482 / Just-Cause-only), the legal increase cap, and your rights — with a confidence level and the evidence behind it.

**Important:** This is an estimate from public records (US Census Geocoder + LA County Assessor), **not** a lookup from LAHD's registry, and **not legal advice**. Always confirm with LAHD.

## Develop
- `npm install`
- `npm run dev` → http://localhost:3000
- `npm test`

## Deploy
Production runs on **Cloudflare Workers** via the OpenNext adapter at **https://rentrights.soursea.io**.

- `npm run preview` — build with `opennextjs-cloudflare` and serve on the real workerd runtime at http://localhost:8788 (port 3000 is never used).
- `npm run deploy` — build + `wrangler deploy`. The `routes` entry in `wrangler.jsonc` attaches the custom domain (DNS record + TLS cert are created automatically on the `soursea.io` zone; the zone must be Active in the deploying Cloudflare account).
- Auth: `npx wrangler login` (interactive OAuth), or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.

Environment:
- `NEXT_PUBLIC_SITE_URL` is **build-time** (inlined by `next build`); the committed `.env.production` pins it to the production origin. A production build that would resolve to localhost fails fast (`lib/seo/site-url.ts`).
- Runtime vars (`UPSTREAM_TIMEOUT_MS`, `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`) go in `wrangler.jsonc` `"vars"`; locally in `.dev.vars`.

Launch checklist (zone-level, dashboard):
- Add the one free **WAF rate-limiting rule** on `soursea.io`: path starts with `/api/` and host `rentrights.soursea.io`, by IP, ~15 req/10s, Block — the in-app limiter (`lib/rate-limit.ts`) is per-isolate best-effort only.
- Disable the `*.workers.dev` preview URL for the Worker so traffic can't bypass the zone WAF.
- After deploy, `curl -sI https://rentrights.soursea.io/` must show `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (privacy-load-bearing: keeps share-link addresses out of Referer).

A Docker self-host alternative is archived in `deploy/docker/` (unsupported, not exercised by CI).

## Architecture
See `docs/superpowers/specs/2026-06-02-rentrights-design.md` and `docs/superpowers/plans/`.

Legal figures live in `lib/legal/constants.ts` with a `lastVerified` date and per-period effective dates. **Update cadence:** RSO % (Jul 1), AB 1482 % (Aug 1), relocation (Jul 1). After updating, run `npm test` then `npm run deploy`.
