# RentRights (M1)

Free, open-source tool: enter a **City of Los Angeles** address and get an *honest estimate* of your rent regime (RSO / AB 1482 / Just-Cause-only), the legal increase cap, and your rights — with a confidence level and the evidence behind it.

**Important:** This is an estimate from public records (US Census Geocoder + LA County Assessor), **not** a lookup from LAHD's registry, and **not legal advice**. Always confirm with LAHD.

## Develop
- `npm install`
- `npm run dev` → http://localhost:3000
- `npm test`

## Architecture
See `docs/superpowers/specs/2026-06-02-rentrights-design.md` and `docs/superpowers/plans/`.

Legal figures live in `lib/legal/constants.ts` with a `lastVerified` date and per-period effective dates. **Update cadence:** RSO % (Jul 1), AB 1482 % (Aug 1), relocation (Jul 1).
