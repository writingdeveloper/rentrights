# RentRights (M1)

Free, open-source tool: enter a **City of Los Angeles** address and get an *honest estimate* of your rent regime (RSO / AB 1482 / Just-Cause-only), the legal increase cap, and your rights — with a confidence level and the evidence behind it.

**Important:** This is an estimate from public records (US Census Geocoder + LA County Assessor), **not** a lookup from LAHD's registry, and **not legal advice**. Always confirm with LAHD.

## Develop
- `npm install`
- `npm run dev` → http://localhost:3000
- `npm test`

## Deploy
Production runs on **Vercel** (native Next.js) at **https://rentrights.writingdeveloper.blog**.

- Deploys on push to `master` via Vercel's GitHub integration; or `vercel --prod` with the CLI.
- The Vercel project's domain is `rentrights.writingdeveloper.blog`.
- Analytics is cookieless **Vercel Web Analytics** (enable it in the project's Analytics tab; `<Analytics/>` is wired in `app/layout.tsx`). No cookies, no consent banner.

Environment:
- `NEXT_PUBLIC_SITE_URL` is **build-time** (inlined by `next build`); the committed `.env.production` pins it to the production origin. A production build that would resolve to localhost fails fast (`lib/seo/site-url.ts`). Mirror it in the Vercel project env to be safe.
- Runtime vars (`UPSTREAM_TIMEOUT_MS`, `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`) go in the Vercel project env.

Launch checklist:
- Add a **Vercel Firewall** rate-limiting rule on `/api/*` (by IP) — the in-app limiter (`lib/rate-limit.ts`) is per-instance best-effort only.
- After deploy, `curl -sI https://rentrights.writingdeveloper.blog/` must show `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (privacy-load-bearing: keeps share-link addresses out of Referer).

A Docker self-host alternative is archived in `deploy/docker/` (unsupported, not exercised by CI).

## Architecture
See `docs/superpowers/specs/2026-06-02-rentrights-design.md` and `docs/superpowers/plans/`.

Legal figures live in `lib/legal/constants.ts` with a `lastVerified` date and per-period effective dates. **Update cadence:** RSO % (Jul 1), AB 1482 % (Aug 1), relocation (Jul 1). After updating, run `npm test`, then bump `CONTENT_LAST_UPDATED` in `lib/seo/content-updated.ts` if the FAQ/home copy changed, and push (Vercel auto-deploys).
