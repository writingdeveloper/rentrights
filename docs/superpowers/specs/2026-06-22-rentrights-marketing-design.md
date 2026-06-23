# RentRights Marketing Strategy — Design

**Date:** 2026-06-22
**Status:** Approved (Wave 1). Build track → writing-plans next. Distribution track → ready-to-use pack in `docs/strategy/2026-06-22-marketing-wave1-distribution-pack.md`.

## Goal

Grow usage of **RentRights** (free, open-source, bilingual EN/ES LA tenant-rights tool, https://rentrights.writingdeveloper.blog) through **$0-budget, contactless (비대면)** channels, reaching LA renters at their moment of need. **Phased/safe:** start low-risk organic channels now; hold the broad public push (press / viral social) until the pending legal-org sign-off.

## Strategic thesis (grounded in web research, 2026-06-22)

**Be the correct, current, address-specific answer — and be present where renters search/ask and where trusted orgs list tools.** Four independent research streams (SEO/GEO, community, partnerships, shareable assets) converged on the same wedge: the 2026 LA rent-increase figures are reported **inconsistently across the web** (e.g. the "3% through 2027" error our own dated constants reject). An accurate, dated, address-keyed tool is **objectively more correct**, which is simultaneously an SEO quality signal and an **AI-citation magnet** (dated data tables ≈ 4× AI citations; freshness is a top citation lever). Our moats — **data freshness, live parcel facts, honest-label, open-source, nothing-saved** — are exactly what this audience and AI engines reward. Overclaiming (DoNotPay's downfall) is the failure mode our honest posture already avoids.

## Decisions (user)

- **Launch posture:** Phased / safe-first. Safe organic channels now; broad public push held until legal-org sign-off.
- **Primary focus:** Reach renters directly — SEO/GEO + community presence + shareable artifacts. Partnerships (org listings) as a high-trust supporting track.

## Channel findings (research)

- **SEO/GEO:** Confirmed high-intent recurring demand ("is my rent increase legal LA", "how much can my landlord raise my rent CA 2026", Spanish equivalents — Spanish SERP is thin = lowest-competition segment). Win via answer-first 40–60 word ledes, question-shaped H2s, dated 3-regime cap tables, FAQ/HowTo JSON-LD matching visible content, freshness cadence. Programmatic = a **small set (4–8) of differentiated regime pages**, NOT per-zip sprawl (penalized by 2025 spam updates). Tool already has FAQ schema / JSON-LD / llms.txt / AI-crawler allowances.
- **Community:** Highest-leverage low-risk = be a genuinely useful answerer on **r/AskLosAngeles + r/Tenant**, link only on-topic (90/10 rule; "be a Redditor with a website, not a website with a Reddit account"). r/LosAngeles = comments only. r/legaladvice = no links (listen / keyword-mine). LA Tenants Union locals + the Tenant Power Toolkit ecosystem = how LA tenant tools actually spread (TPT ≈ 1-in-5 county eviction appeals). Open-source + nothing-saved + honest-label = trust unlock; bring it as a gift, not a pitch.
- **Partnerships (contactless, NO sign-off needed — we index OUR tool on THEIR list):** Civic Tech Field Guide, Eviction Innovation, GitHub Topics, awesome-civic / awesome-legaltech PRs, UCLA Law LibGuides. Slower email asks: 211 LA, Stay Housed LA / DCBA (rent@dcba.lacounty.gov), Tenants Together, LawHelpCA, JustFix. Press = PREPARE-HOLD until sign-off.
- **Assets:** The **client-side share Result Card PNG** is the #1 leverage change (renters already screenshot; a clean branded link-bearing card turns every use into a portable artifact). Plus cornerstone + regime explainer pages, OG upgrade, and a client-side **.ics reminder** (privacy-safe alternative to "notify me", which would break the cookieless promise).

## Phasing

- **Wave 1 (now — safe + compounding + contactless):** [build] share Result Card, cornerstone explainer + FAQ schema, OG/link-preview upgrade; [distribution] the ~1-hour zero-gatekeeper directory-listing sprint.
- **Wave 2:** regime landing pages (×4), client-side .ics reminder, the freshness maintenance ritual, authentic community presence (help-first snippet kit), Tier-2 email asks.
- **Wave 3 (after legal-org sign-off):** "I got a rent-increase / eviction notice — what do I do?" action guide, bilingual printable one-pager, legal-aid / LATU-local partnerships, press outreach.

## Wave 1 — Build scope (Track A, I implement)

1. **Share Result Card (client-side PNG).** A button on the result that renders a clean, self-contained card image (EN + ES): verdict ($ + %), one-line "why" (which law + the cap), an **"as of <date>" stamp that inherits the live dated value** (so a forwarded screenshot can't go stale-wrong after 2026-07-01), the URL, and an "info, not legal advice" line. 100% client-side, nothing saved. Portrait 1080×1350 (group-chat/story) + 1200×630 (link unfurl) variants.
2. **Cornerstone explainer page.** "How much can my landlord raise my rent in Los Angeles (2026)?" — answer-first lede, question-shaped H2s, a **dated 3-regime cap table built from `LEGAL` constants**, FAQPage JSON-LD matching the visible Q&A, a prominent CTA into the checker, primary-source citations (LAHD / DCBA / CA AG). Strictly descriptive (info, not advice). EN this wave; ES mirror in Wave 2 (or this wave if scope allows).
3. **OG / link-preview upgrade.** 1200×630, < ~300KB (renders cleanly in iMessage/WhatsApp), trustworthy civic-tool title/description ("Free · LA rent-increase checker · EN/ES"), validated previews.

## Wave 1 — Distribution scope (Track B, user executes, I prepare copy)

A ready-to-paste pack (`docs/strategy/2026-06-22-marketing-wave1-distribution-pack.md`) for the ~1-hour sprint: Civic Tech Field Guide submission, Eviction Innovation Airtable, GitHub repo Topics, awesome-civic + awesome-legaltech PR text, UCLA law-librarian email, plus reusable blurbs and a help-first community snippet template. **None of this trips the sign-off gate** (we list our own tool on their index; we surface no new org contact inside the app).

## Guardrails

- **Real/accurate data only.** Every figure renders from dated `LEGAL` constants with an "as of" date; keep `value:null` where undetermined (the "3% through 2027" claim is a third-party error). A wrong number kills the freshness-trust moat this whole strategy depends on.
- **Privacy.** All assets client-side / no PII. No "notify me" email capture — use the client-side `.ics`. Preserves the cookieless "nothing saved" promise (itself a trust asset with this audience).
- **Honest-label preserved everywhere** (estimate, not legal advice, confirm with the housing authority).
- **No automation** of posting/login. The user executes all external posting / submitting / emailing; I only draft.
- **Sign-off-gated (NOT in Wave 1):** explicit "what to do" action steps, bilingual printable with org contacts, press outreach, and surfacing any new org phone/URL inside the tool.

## Success signals (no paid analytics beyond cookieless Vercel)

Indexing/ranking for target queries; appearances as an AI-Overview / ChatGPT / Perplexity citation; directory listings live; referral traffic from listings + community; share-card usage. Review monthly.

## Sources

Captured in the four research deliverables (2026-06-22): LAHD/DCBA/SAJE/CA-AG legal pages; GEO playbooks (Frase, CXL citation study, Search Engine Land); Reddit self-promo norms; Civic Tech Field Guide / Eviction Innovation / GitHub topics / awesome-lists; JustFix & Tenant Power Toolkit growth case studies; OG best-practice guides.
