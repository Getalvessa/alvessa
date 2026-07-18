# Project State

> Single source of truth for operational state. Overwrite in place — never append history.
> Last updated: 2026-07-18 (Utrecht Massage Recruitment — release commit)

## Current State

| Dimension | Value |
|-----------|-------|
| Environment | **PRODUCTION** — https://alvessa.nl |
| Launch mode | **utrecht-massage-recruitment-release-committed-awaiting-production-approval** |
| Public narrative | Utrecht Massage therapist recruitment; customer bookings **not open**; FAQ/About/Contact + historical Utrecht SEO landings aligned; `<html lang>` fixed |
| SEO mode | **FULL HIDDEN** — all public pages noindex, sitemap empty, robots.txt allows crawl |
| Stripe | Test mode (infrastructure previously verified; Live not enabled) |
| Utrecht | `status: 'supply_testing'`, `publicVisible: false` — **not** a public booking city |
| Groningen | Cleaning track **retained** (code, routes, data, migrations); removed from public primary nav/home narrative; `publicVisible: false` |

## Current Sprint

**Utrecht Massage Recruitment Mode** (2026-07-16/18) — release commit created locally; awaiting separate Production Deployment Approval Gate. See `docs/CURRENT_SPRINT.md`.

## Next Milestone

1. **Production Deployment Approval Gate** against the exact release commit SHA on `release/rc-3` (founder approval required — no push/deploy in the commit task).
2. First real Utrecht massage therapist applies and completes onboarding.
3. **Provider Onboarding and Controlled Utrecht Massage Booking Verification** (Stripe Test).
4. Only then consider customer booking activation (`publicVisible`) with founder approval.
5. GA / SEO / Stripe Live remain separate founder-gated milestones (rewrite `docs/GA_RELEASE_CHECKLIST.md` + `docs/SMOKE_TEST_RUNBOOK.md` for Utrecht Recruitment/Booking before GA).

## Last Completed Sprint

**Utrecht Massage Recruitment Mode** (2026-07-16/18) — public narrative, landings, html lang, Mobile Header Logo + Login + Recruitment CTA; Preview `dpl_9S3GZmNyRXEjGv4p6tENxf8qdakC` visual QA PASS; Share restored to Only people with access; local release commit.

## Completed Work (relevant)

- Utrecht massage marketplace foundation (auth, booking, Stripe Checkout + webhook, RLS, dashboards, i18n) — built
- Groningen cleaning track — built and retained; public primary narrative no longer cleaning
- City gate (`lib/cities.ts`) — all cities `publicVisible: false` unless explicitly flipped
- 2026-07-16: public site switched to Utrecht Massage **recruitment** messaging; `/voor-masseurs` is primary provider CTA
- 2026-07-17: historical Utrecht SEO landings (copy/CTA/JSON-LD) aligned to recruitment; sole `<html lang>` from `[locale]` param; Preview Supabase public vars present
- 2026-07-17: Mobile Header Recruitment CTA (NL `Aanmelden` / EN `Apply`); EN consistency pass; lint/type-check/build PASS
- 2026-07-18: Mobile Login restored alongside Recruitment CTA — Mobile Header = **Logo + Login + Recruitment CTA**; Register desktop-only; **no hamburger menu**
- 2026-07-18: Preview `dpl_9S3GZmNyRXEjGv4p6tENxf8qdakC` final mobile/desktop visual QA **PASS**; founder confirmed Share restored; local release commit created

## Open Debts

| # | Debt | Severity | Fix window |
|---|------|----------|------------|
| 1 | `StudioInfoStep` shows massage copy for hybrid+in_studio cleaning providers | 🟢 LOW | If cleaning studio mode ever ships |
| 2 | `TZ_OFFSET_H=2` hardcoded (CEST only) — breaks after October clock change | 🟡 MED | Before November |
| 3 | Self-service cancellation not built — copy routes to hello@alvessa.nl | 🟢 LOW | Sprint 8 or post-launch |
| 4 | ~~Historical Utrecht SEO landings “book now” copy~~ — **addressed 2026-07-17** (recruitment copy; noindex retained) | — | — |
| 4b | Full legal counsel review of privacy/terms after recruitment-mode wording tweak (only §1 definitions/identity updated) | 🟡 MED | Before GA |
| 5 | Stripe webhook writes literal `payments.platform_fee_cents: 0` — must mirror booking fee when commission ≠ 0 | 🟢 LOW | Stripe Connect payouts sprint |
| 6 | ~~`<html>` has no `lang` attribute~~ — **addressed 2026-07-17** (`lang` from `[locale]` layout) | — | — |
| 7 | `createBooking` does not re-check `getPublicCitySlugs()` (UI gated only) | 🟡 MED | Before multi-city public launch |
| 8 | `address_city` server fallback still `'Groningen'` if field omitted | 🟢 LOW | Before Utrecht booking activation |
| 9 | ~~Mobile Header had no recruitment CTA~~ — **addressed 2026-07-17** | — | — |
| 10 | ~~Mobile Header hid Login after CTA fix~~ — **addressed 2026-07-18** (Login + CTA; Preview QA PASS) | — | — |
| 11 | `docs/GA_RELEASE_CHECKLIST.md` + `docs/SMOKE_TEST_RUNBOOK.md` still describe old Groningen Booking GA — **excluded from this release**; need Utrecht Recruitment-aware rewrite | 🟡 MED | Before Booking GA |

## Verified Facts

- Framework is **Next.js 16.2.6** (`proxy.ts`; awaited `params`)
- Schema SoT: `docs/SCHEMA_SNAPSHOT.md`
- Bookings INSERT = service_role only by design
- Category behaviour SoT: `lib/categories.ts`; masseurs apply page pins `categorySlug="massage"`
- Commission rates are 0 for all categories today
- **Utrecht Supply Gate: FAIL** — no confirmed bookable Utrecht massage provider in production data
- Stripe Test path previously verified historically; **Utrecht Massage Runtime Regression** still pending first therapist
- Vercel Preview has `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (do not re-add)
- Mobile Header pattern = **Logo + Login + Recruitment CTA** (Register desktop-only; no hamburger)
- Validated Preview for this release: `dpl_9S3GZmNyRXEjGv4p6tENxf8qdakC` (Preview only; Production unaffected)
- Logged-out Header runtime: verified on Preview; logged-in Header runtime: **UNVERIFIED** (static branch reviewed earlier)

## Pre-Launch SEO Strategy

**Current Mode: FULL HIDDEN.** Do not remove noindex or populate sitemap without founder written approval.

## Blocking Issues

- **Customer booking activation blocked** until Utrecht Supply Gate passes.
- **GA blocked** on founder approvals (Stripe Live, publicVisible, phased SEO) — html lang debt closed.
- **Production deploy blocked** until separate Production Deployment Approval Gate against this release commit.

## Next Recommended Task

Run a separate **Production Deployment Approval Gate** against the exact release commit SHA. Do not push, promote, or deploy Production from the commit task.
