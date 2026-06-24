# Changelog

All notable changes to RentRights are documented here.

## v0.1.0 — 2026-06-23

First tagged release. Live at https://rentrights.writingdeveloper.blog

### Core
- LA street address → which rent law applies (City **RSO**, CA **AB 1482**, LA County **RSTPO**, or just-cause-only), with the current legal rent-increase cap
- Rent-increase legality checker (flags increases over the legal cap and shows the max)
- Renter's key protections per regime, with a confidence level and targeted confirming questions when public records are incomplete
- Bilingual (English / Spanish), no sign-up, nothing stored — an estimate from public records, not legal advice

### Data pipeline
- Real public-records pipeline: CAMS rooftop geocoder → Assessor parcels (point-in-polygon → AIN) → assessment roll, with the US Census geocoder for jurisdiction
- Performance: re-querying through indexed situs fields drops the Assessor lookup from 13–55s to ~1s; every upstream call is wrapped in an `AbortController` timeout that degrades to confirming-questions instead of hanging
- Legal figures are dated constants with effective dates that auto-degrade to "pending — confirm with LAHD" when a period lapses

### Marketing
- Shareable result-card image
- Cornerstone SEO/GEO page
- Client-side `.ics` cap-change reminder
