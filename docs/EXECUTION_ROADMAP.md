# EXECUTION ROADMAP — Alvessa Groningen Cleaning MVP

> **CTO Execution Document — Read-Only Foundation, Forward-Only Sprint Plan**
>
> The Foundation is frozen. This document converts it into a delivery schedule.
> Target: accept the first real paid cleaning booking in Groningen.
>
> Generated: 2026-07-01

---

## Baseline: What the Foundation Provides

The following modules are **production-ready and require no rebuild**. Every sprint below
builds on top of this, never underneath it.

| Module | Status | Reuse Implication |
|---|---|---|
| Supabase Auth (email + Google OAuth) | ✅ Stable | Zero work — reused as-is |
| RLS framework (24 migrations) | ✅ Stable | New tables follow existing pattern |
| Booking engine (4-step flow, service_role INSERT) | ✅ Stable | Adapt for cleaning params — core logic unchanged |
| Stripe Checkout + webhook | ✅ Stable | Reused as-is |
| Email notifications (Resend) | ✅ Stable | New templates needed, infrastructure unchanged |
| Provider dashboard shell | ✅ Stable | Cleaning partner uses same dashboard |
| Admin dashboard | ✅ Stable | Add Groningen filter + cleaning category views |
| City architecture (canonical slugs + visibility gate) | ✅ Stable | Add `groningen` config entry + migration |
| i18n system (NL/EN, next-intl) | ✅ Stable | Add cleaning-specific NL/EN keys |
| SEO infrastructure (JSON-LD, sitemap) | ✅ Stable | Add Groningen cleaning landing pages |
| Middleware auth guard (proxy.ts) | ✅ Stable | Zero work |

**What is NOT built and IS needed for Groningen Cleaning:**
- `groningen` city entry in `lib/cities.ts` + DB CHECK constraint migration
- `cleaning` service category seed data
- Cleaning-specific service definitions (hours-based pricing)
- Cleaning partner onboarding adaptations (property types, service scope)
- Groningen-specific public pages and SEO landing pages
- NL/EN copy for cleaning category
- Self-service cancellation (currently routes to email — acceptable for MVP, fix in Sprint 8)
- Timezone: `TZ_OFFSET_H` must handle winter CET before November launch

---

## Sprint Dependency Graph

```
Sprint 1 (Platform Core)
    │
    ├─► Sprint 2 (Cleaning Category)
    │       │
    │       ├─► Sprint 3 (Partner Portal)   ─┐
    │       │                                 │
    │       └─► Sprint 4 (Booking Flow)      │  parallel
    │                   │                    │
    │                   └─► Sprint 5 (Payments) ◄─┘
    │                               │
    │                   Sprint 6 (Reviews) ◄── after Sprint 5
    │                   Sprint 7 (Admin)   ◄── after Sprint 3
    │                               │
    │                   Sprint 8 (Launch Prep) ◄── after Sprints 6 + 7
    │                               │
    │                   Sprint 9 (Production Validation) ◄── final gate
    │
    └─► LAUNCH
```

### Critical Path

```
S1 → S2 → S4 → S5 → S8 → S9 → LAUNCH
```

### Parallel Work Windows

| Window | Parallel Work |
|---|---|
| After S2 completes | S3 (Partner Portal) + S4 (Booking Flow) can run simultaneously |
| After S5 completes | S6 (Reviews) + S7 (Admin) can run simultaneously |

### Hard Blockers (cannot be bypassed)

1. **S1 must ship before any other sprint starts** — Groningen city config + cleaning schema are foundations for all downstream work.
2. **S4 cannot ship without S2** — booking flow reads service category to scope available services.
3. **S5 cannot ship without S4** — payment requires a confirmed booking record to exist.
4. **S9 (production validation) is a hard gate** — do not flip `publicVisible=true` for Groningen until S9 exit criteria pass.

---

## Sprint 1 — Platform Core

**Objective:** Groningen city is registered in the system. Cleaning category exists in the database. The platform builds and deploys without errors.

**Estimated Complexity:** Low-Medium (configuration + schema, no new UI patterns)
**Technical Risk:** Low — follows existing city + category patterns exactly

### Product Features
- Groningen becomes a recruitable and eventually public city
- `cleaning` service category exists with correct i18n slugs
- No public user-facing change yet (both flags hidden)

### Backend

**Database**
- Migration: add `groningen` to `providers.city` and `provider_applications.city` CHECK constraints
- Seed: `service_categories` row — `{ slug: 'cleaning', name_nl: 'Schoonmaak', name_en: 'Cleaning', is_active: true }`
- Seed: 2–3 baseline `services` rows for cleaning (e.g., `cleaning-2h`, `cleaning-3h`, `cleaning-4h`) with NL/EN names, default durations, default prices
- No new tables — schema is generic and accommodates cleaning without modification

**API**
- No new routes — existing availability and booking APIs are category-agnostic
- Confirm: `lib/providers/public.ts` queries are scoped by `getPublicCitySlugs()` — Groningen stays invisible until Sprint 8 flip

**Permissions**
- No RLS changes — new city/category rows fall under existing policies
- Verify: `provider_applications.city` CHECK constraint updated in migration

### Frontend
- `lib/cities.ts`: add `groningen` entry with `status: 'prelaunch'`, `publicVisible: false`, `recruitmentVisible: true`
- No new pages — Groningen is not publicly visible yet
- Provider application form now offers Groningen as a recruitment city

### Infrastructure
- Migration numbered `202607XXXXXX_add_groningen_city_and_cleaning_category.sql`
- Deployment: code first, migration second (follow ADR-0001 deployment order)
- Confirm build passes: `npm run lint && npm run build`

### Testing
- Unit: `lib/cities.ts` — `getPublicCitySlugs()` excludes Groningen, `getRecruitmentCitySlugs()` includes it
- Integration: provider application form correctly saves `city: 'groningen'`; DB CHECK constraint rejects `city: 'groningen-city'`
- Manual: apply as provider in Groningen, verify application saved with correct slug

### Exit Criteria
- [ ] `npm run build` passes with zero errors
- [ ] `groningen` accepted by DB CHECK constraint
- [ ] Cleaning category visible in Supabase dashboard
- [ ] `getPublicCitySlugs()` does NOT include `groningen`
- [ ] Provider application form shows Groningen as an option

---

## Sprint 2 — Cleaning Category

**Objective:** The cleaning category is fully configured: services defined with correct hours/pricing, NL/EN copy complete, booking parameters scoped for cleaning.

**Estimated Complexity:** Medium (new copy, pricing model, booking parameter differences)
**Technical Risk:** Low-Medium — cleaning differs from massage in service parameters

### Product Features
- Cleaning services priced per booking type (2h / 3h / 4h flat rate)
- Service descriptions explain what's included (supplies included by cleaner by default)
- Booking accepts `appointment_type` values relevant to cleaning (`regular`, `deep_clean`, `end_of_tenancy`)
- Property type (apartment / house / office) captured as `customer_notes` — no schema change needed for MVP

### Backend

**Database**
- Finalize `services` seed rows for cleaning:
  ```
  schoonmaak-2uur  | Schoonmaak 2 uur  | 2h  | €79  | category: cleaning
  schoonmaak-3uur  | Schoonmaak 3 uur  | 3h  | €109 | category: cleaning
  schoonmaak-4uur  | Schoonmaak 4 uur  | 4h  | €139 | category: cleaning
  diepte-reiniging | Dieptereiniging   | 4h  | €169 | category: cleaning
  einde-huur       | Einde huur schoonmaak | 5h | €199 | category: cleaning
  ```
- No new columns — `customer_notes` field absorbs property type input from booking form
- `appointment_type` values in bookings table already exist as a free field — document allowed values

**API**
- No new routes
- Verify: `availability/route.ts` works correctly for longer duration slots (3–5h blocks instead of 60–90min)

**Permissions**
- No changes

### Frontend

**Pages**
- None yet (public pages are Sprint 8)

**Components**
- `components/booking/property-type-selector.tsx` — radio group: apartment / house / studio / office (renders in Step 1 of booking flow for cleaning category bookings only)

**Forms**
- Booking flow Step 1 (service selection): conditionally show property type selector when `category === 'cleaning'`

### Infrastructure
- Stripe: verify that 3–5h slot durations do not break Stripe Checkout metadata (test with mock data)
- No email template changes yet

### i18n
- `messages/nl.json`: add `cleaning.*` namespace — all service names, property type labels, booking instructions
- `messages/en.json`: English equivalents

### Testing
- Unit: pricing seed data matches expected `custom_price_cents` values
- Unit: property type selector renders conditionally for cleaning, hidden for massage
- Manual: create test cleaning booking in staging — confirm `customer_notes` captures property type
- Manual: verify 4h cleaning slot blocks correct calendar range

### Exit Criteria
- [ ] All 5 cleaning service types exist in `services` table with correct prices and durations
- [ ] NL/EN copy for all cleaning services added to `messages/`
- [ ] Property type selector renders correctly in booking flow (cleaning only)
- [ ] A 4h cleaning slot correctly blocks 4h on the availability calendar

---

## Sprint 3 — Partner Portal

**Objective:** A cleaning partner (individual cleaner or small cleaning business) can complete onboarding, configure their services, set availability, and appear as recruitable in Groningen.

**Estimated Complexity:** Medium (reuses dashboard infrastructure, adds cleaning-specific onboarding copy)
**Technical Risk:** Low — dashboard architecture is stable; this sprint is primarily copy + config

> **MVP Decision:** Partners are individual cleaners, not cleaning companies. Multi-worker
> team management is deferred. The existing provider dashboard supports this model exactly.

### Product Features
- Cleaning partner applies via existing `/voor-masseurs` equivalent (new Groningen cleaning landing)
- Partner onboarding: profile → services → availability → Stripe Connect
- Partner can configure which cleaning service types they offer and at what price
- Partner can set weekly availability schedule (e.g., Mon–Fri 08:00–17:00)
- Partner sees their upcoming and past cleaning bookings in dashboard

### Backend

**Database**
- No new tables
- `providers` table: `city: 'groningen'` stored correctly
- `provider_services` linked to cleaning service IDs
- Seed: 1–2 test cleaning partners in staging for E2E testing

**API**
- No new routes
- Verify: dashboard booking list filters correctly when provider has only cleaning bookings

**Permissions**
- No RLS changes — existing provider RLS applies

### Frontend

**Pages**
- `/voor-schoonmakers` (new): recruitment landing page for cleaning partners in Groningen
  - Dutch-first copy explaining partner terms, earnings, onboarding
  - CTA links to existing provider application form (pre-selects `groningen` city, `cleaning` service type)
- Dashboard pages: no structural changes — cleaning partners use same dashboard routes

**Components**
- `components/providers/cleaning-service-selector.tsx` — multi-select for which cleaning services a partner offers (used inside `/dashboard/diensten`)
- Service mode for cleaning defaults to `mobile_only` (cleaner goes to customer)

**Forms**
- Provider application form: if `city === 'groningen'` and `service_types` includes cleaning, show cleaning-specific experience question ("Hoeveel jaar schoonmaakervaring?")

### Infrastructure
- Email: no template changes — existing "Nieuwe boeking" email works for cleaning
- Stripe Connect: no changes — same onboarding flow

### i18n
- `messages/nl.json`: add `providerRecruitment.cleaning.*` namespace
- `messages/en.json`: English equivalents

### Testing
- Unit: `/voor-schoonmakers` page renders without errors
- Integration: cleaning partner application saved with `city: 'groningen'`, correct service types
- Manual: full partner onboarding flow — apply → admin approves → partner sets availability → partner configures cleaning services → Stripe Connect onboarding

### Exit Criteria
- [ ] `/voor-schoonmakers` page live on staging
- [ ] Provider application form correctly handles Groningen + cleaning combination
- [ ] At least 1 test cleaning partner fully onboarded in staging
- [ ] Partner can see their cleaning services in `/dashboard/diensten`
- [ ] Partner availability set and visible in availability API response

---

## Sprint 4 — Booking Flow

**Objective:** A customer can complete a cleaning booking end-to-end (without payment): select service → choose property type → pick date/time → enter Groningen address → confirm.

**Estimated Complexity:** Medium (cleaning params extend existing 4-step flow; Groningen address validation)
**Technical Risk:** Medium — modifying booking flow touches Subsystem A (HIGH RISK); must follow STABLE_MODULES.md

> **Mandatory:** Read `docs/STABLE_MODULES.md` completely before touching any file in
> `app/[locale]/aanbod/[slug]/boeken/`. All 9 invariants apply.

### Product Features
- Customer selects a cleaning service type (2h / 3h / deep clean / end of tenancy)
- Customer enters Groningen address (Google Maps Places API, scoped to Groningen municipality)
- Date/time picker shows 08:00–17:00 windows for cleaning (different from massage evening slots)
- Cleaning booking summary shows: service type, property type, address, date, duration, price
- Booking confirmation page adapted for cleaning context

### Backend

**Database**
- No schema changes
- Verify: `bookings.appointment_type` field accommodates `regular_clean`, `deep_clean`, `end_of_tenancy`
- Verify: `customer_notes` field stores property type string (e.g., "apartment, 65m²")

**API**
- `app/api/availability/route.ts`: no logic changes; verify it handles 3–5h duration windows correctly
- `app/[locale]/aanbod/[slug]/boeken/actions.ts`: verify `appointment_type` values are allowlisted server-side (do not trust client input)

**Permissions**
- No RLS changes
- `actions.ts` must continue using `createServiceRoleClient()` for INSERT — do not change this

### Frontend

**Pages**
- `app/[locale]/aanbod/[slug]/boeken/page.tsx`: no structural change
- `app/[locale]/boeken/succes/page.tsx`: adapt success copy for cleaning context (NL: "Uw schoonmaak is bevestigd")

**Components**
- `booking-flow.tsx` Step 1: inject property type selector for cleaning bookings
- `booking-flow.tsx` Step 3 (address): scope Google Maps autocomplete to Groningen postal codes (`2800–2899` range does not apply — use `gemeente: Groningen` restriction in Places API)
- `booking-flow.tsx` Step 4 (confirm): show property type + service duration prominently in summary

**Forms**
- Address step: add optional field "Bijzonderheden" (access code, preferred entry notes) — maps to `customer_notes` alongside property type

### Infrastructure
- Google Maps Places API: add `componentRestrictions: { locality: 'Groningen' }` to address autocomplete
- No Stripe changes yet

### i18n
- `messages/nl.json`: booking flow copy for cleaning context (`booking.cleaning.*`)
- Confirm: no hardcoded city names in booking flow components

### Testing
- Unit: `actions.ts` server-side validation rejects `appointment_type` values not in allowlist
- Unit: address autocomplete scopes to Groningen correctly
- Integration: full booking flow from service selection to confirmation screen in staging
- Manual: create a cleaning booking — verify `customer_notes` has property type, `appointment_type` is set, `scheduled_at` is correct, `duration_minutes` matches selected service

### Exit Criteria
- [ ] Customer can complete a cleaning booking (no payment required for this sprint)
- [ ] `npm run lint && npm run build` pass with zero errors
- [ ] Booking record in Supabase has correct `appointment_type`, `duration_minutes`, `customer_notes`
- [ ] Address autocomplete restricts to Groningen geography
- [ ] Conflicting cleaning slots are blocked (overlap exclusion constraint enforced)
- [ ] `actions.ts` still uses `createServiceRoleClient()` for INSERT (invariant preserved)

---

## Sprint 5 — Payments

**Objective:** Cleaning bookings require Stripe payment. Stripe Checkout works for Groningen cleaning services. Provider receives correct payout after booking completion.

**Estimated Complexity:** Low (Stripe infrastructure is stable; this is configuration verification, not new build)
**Technical Risk:** High — touches Subsystem A payment path; dedicated task + review required before any code change

> **Mandatory:** No changes to `app/api/stripe/webhook/route.ts` or Stripe config without
> explicit written approval. Run `npm run build` after every change to payment-adjacent files.

### Product Features
- Customer pays at booking via Stripe Checkout (card only for MVP)
- Platform commission: configurable (default 15% for cleaning)
- Provider payout: triggered after partner marks booking `completed`
- Failed payment: booking remains `pending_payment` and is not shown to partner
- Webhook idempotency: duplicate `payment_intent.succeeded` events handled safely

### Backend

**Database**
- No schema changes
- Verify: `payments` table records are created correctly for cleaning bookings
- Verify: `platform_fee_cents` and `provider_earnings_cents` calculated correctly for cleaning price points

**API**
- `app/[locale]/aanbod/[slug]/boeken/actions.ts`: confirm `platformFeePercent` constant is configurable (not hardcoded to a massage-specific value)
- `app/api/stripe/webhook/route.ts`: no changes — handler is category-agnostic
- Stripe webhook secret: confirm correct secret is set in Vercel env vars for production

**Permissions**
- `payments` table: written exclusively by webhook via service_role — no change
- Verify: no authenticated INSERT policy exists on `payments` (by design)

### Frontend
- No payment UI changes — Stripe Checkout hosted page handles everything
- `app/[locale]/boeken/succes/page.tsx`: confirm cleaning-specific success copy is correct

### Infrastructure
- **Stripe test mode**: run full payment flow against Stripe test clock with cleaning price amounts (€79–€199 range)
- **Stripe webhook**: verify webhook is registered in Stripe dashboard for staging environment
- **Stripe Connect**: verify cleaning partner can complete onboarding and receive test payout
- Commission: document platform fee percentage for cleaning (may differ from massage) in `.env.local.example`

### Testing
- Integration: full end-to-end — book cleaning → Stripe Checkout → test card → webhook fires → booking `confirmed` → partner sees booking
- Integration: failed payment (Stripe test card `4000 0000 0000 0002`) → booking stays `pending_payment` → customer sees error
- Manual: provider marks booking `completed` → verify payout initiated in Stripe dashboard
- Manual: trigger duplicate webhook event → confirm idempotency (no error, no duplicate payment record)

### Exit Criteria
- [ ] Stripe test payment succeeds for a cleaning booking
- [ ] Booking status transitions: `pending_payment → confirmed` on successful payment
- [ ] `payments` record created with correct `amount_cents`, `platform_fee_cents`, `provider_amount_cents`
- [ ] Provider Stripe Connect receives correct test payout
- [ ] Failed payment does not confirm booking
- [ ] `npm run lint && npm run build` pass with zero errors

---

## Sprint 6 — Reviews

**Objective:** Customers can submit a review after a completed cleaning booking. Reviews are visible on the partner's profile.

**Estimated Complexity:** Low (review infrastructure exists; cleaning-specific adaptation is copy only)
**Technical Risk:** Low — `reviews` table and RLS are stable; no changes to payment or booking logic

### Product Features
- Customer receives review request (email or dashboard prompt) after booking is marked `completed`
- Review: 1–5 stars + optional comment
- Review is published after admin approval (`is_published` toggle in admin)
- Partner's `avg_rating` and `total_reviews` update automatically via existing trigger
- For cleaning: review prompt copy adapted ("Hoe was uw schoonmaak?")

### Backend

**Database**
- No schema changes — `reviews` table is category-agnostic
- Verify: INSERT validation — `booking.status = 'completed'` and `provider_id` matches booking

**API**
- No new routes
- Consider: server action for review submission (reuse pattern from booking actions)

**Permissions**
- `reviews` RLS: customer can INSERT (own completed bookings only); admin can toggle `is_published`; no customer UPDATE
- No changes to existing policies

### Frontend

**Pages**
- `app/[locale]/mijn-boekingen/page.tsx`: show "Schrijf een review" CTA for completed cleaning bookings without existing review

**Components**
- `components/reviews/review-form.tsx` — star selector + textarea + submit button
- `components/reviews/review-card.tsx` — published review display on partner profile page

**Forms**
- Review form: cleaning-specific placeholder copy in textarea ("Vertel anderen over uw schoonmaakervaring...")

### Infrastructure
- Email: add "Review verzoek" email template in Resend — sent when booking transitions to `completed`
- Trigger: review request email fires from webhook or server action on `completed` transition

### i18n
- `messages/nl.json`: `review.*` namespace — cleaning-adapted copy
- `messages/en.json`: English equivalents

### Testing
- Unit: review form validates 1–5 star rating is required
- Integration: submit review for completed cleaning booking → record appears in `reviews` table with `is_published: false`
- Manual: admin publishes review → review appears on partner profile → `avg_rating` updates

### Exit Criteria
- [ ] Customer can submit review from "My Bookings" after cleaning completion
- [ ] Review appears in admin dashboard as unpublished, pending approval
- [ ] Admin publishes review → visible on partner profile
- [ ] Partner `avg_rating` reflects new review within 5 seconds of INSERT

---

## Sprint 7 — Admin

**Objective:** Admin can manage Groningen cleaning operations: approve partners, manage bookings, view category-specific analytics.

**Estimated Complexity:** Low-Medium (extend existing admin views with Groningen + cleaning filters)
**Technical Risk:** Low — admin is Subsystem E (Medium Risk); no payment mutations

### Product Features
- Admin can filter bookings by `city: groningen` and `category: cleaning`
- Admin can approve/reject cleaning partner applications
- Admin can view cleaning-specific metrics (bookings today, revenue this week, active partners)
- Admin can manually cancel or complete a cleaning booking
- Admin can toggle review `is_published` for cleaning reviews
- Audit log captures all admin actions on cleaning entities

### Backend

**Database**
- No schema changes
- Verify: `admin_audit_log` correctly captures cleaning partner approval actions (`action: 'application.approve'`, `target_type: 'application'`)

**API**
- No new routes
- Admin server actions: add `city` + `category` filter parameters to booking and provider list queries

**Permissions**
- No RLS changes — existing `is_admin()` guard applies

### Frontend

**Pages**
- `app/[locale]/admin/boekingen/page.tsx`: add city filter dropdown (includes Groningen), category filter (Massage / Cleaning)
- `app/[locale]/admin/aanbieders/page.tsx`: add city filter, show cleaning partner application count
- `app/[locale]/admin/page.tsx`: add Groningen cleaning stats card (bookings this week, revenue, active partners)

**Components**
- `components/admin/city-filter.tsx` — shared filter component (city + category selectors)
- `app/[locale]/admin/boekingen/bookings-table.tsx`: show `appointment_type` column for cleaning bookings

### Infrastructure
- No changes

### i18n
- `messages/nl.json`: admin UI labels for cleaning category filters

### Testing
- Unit: city filter correctly passes `groningen` to query
- Manual: admin approves cleaning partner → `providers.status` changes to `trusted`, audit log entry created
- Manual: admin filters bookings to Groningen / Cleaning only → correct results
- Manual: admin cancels cleaning booking → status moves to `cancelled`, customer/partner notified

### Exit Criteria
- [ ] Admin can filter all booking views by Groningen + Cleaning
- [ ] Admin can approve a cleaning partner application (triggers audit log)
- [ ] Groningen cleaning stats visible on admin overview page
- [ ] Admin can cancel or complete a cleaning booking manually

---

## Sprint 8 — Launch Preparation

**Objective:** Platform is ready for real customers in Groningen. GDPR compliance, SEO, monitoring, and performance are validated.

**Estimated Complexity:** High (many parallel workstreams — coordinate carefully)
**Technical Risk:** Medium — SEO and legal have no code risk; timezone fix is medium risk; monitoring has low risk

> **Timezone Critical Path:** `TZ_OFFSET_H=2` is hardcoded for CEST (UTC+2). If launching
> before end of October, this is acceptable. If launch extends into November (CET, UTC+1),
> this MUST be fixed before launch. Plan timezone fix as a dedicated sub-task of Sprint 8.

### Product Features
- Groningen is publicly visible (`publicVisible: true`, `status: 'active'` in `lib/cities.ts`)
- Groningen cleaning SEO landing pages live
- Customer-facing cancellation works (self-service or clear email CTA — current state routes to hello@alvessa.nl, acceptable for MVP)
- Cookie consent banner displays for Groningen visitors
- Privacy policy and terms cover cleaning services
- Error monitoring captures production issues

### Backend

**Database**
- `lib/cities.ts` update: `groningen` → `status: 'active'`, `publicVisible: true`
- This is the **launch switch** — do not flip until all other sprint exit criteria are met

**API**
- Verify: `getPublicCitySlugs()` returns `groningen` after config update
- Verify: provider listing page shows Groningen cleaning partners

**Permissions**
- No changes

### Frontend

**Pages**
- `app/[locale]/schoonmaak-aan-huis-groningen/page.tsx` — SEO landing: house cleaning Groningen
- `app/[locale]/thuisschoonmaak-groningen/page.tsx` — SEO landing: home cleaning
- `app/[locale]/schoonmaakdiensten-groningen/page.tsx` — SEO landing: cleaning services
- Update `app/[locale]/aanbod/page.tsx`: add Groningen + Cleaning filter options
- Update `app/[locale]/page.tsx` (homepage): if Groningen is now public, show Groningen option in city selector

**Components**
- `components/seo/json-ld.tsx`: add `LocalBusiness` structured data for Groningen cleaning

**Infrastructure**
- **Error monitoring**: Sentry (or equivalent) — configure `SENTRY_DSN` in Vercel env, wrap critical booking/payment paths
- **Analytics**: Plausible (privacy-first) — add tracking snippet, configure Groningen goal funnels
- **Performance**: run Lighthouse audit on Groningen cleaning pages; target >80 mobile, >90 desktop
- **Timezone fix** (if pre-November launch is not guaranteed): replace `TZ_OFFSET_H=2` with dynamic `Intl.DateTimeFormat` offset calculation
- **Load test**: simulate 20 concurrent cleaning booking attempts — verify no slot double-booking

### Legal & GDPR
- Privacy policy update: mention cleaning services and Groningen
- Terms of service: confirm coverage of cleaning bookings (cancellation terms, damage liability language)
- Cookie consent banner: already implemented — verify it fires on Groningen pages

### i18n
- Groningen cleaning landing page copy (NL primary, EN secondary)
- SEO metadata: Dutch `<title>` and `<meta description>` for each landing page

### Testing
- Unit: SEO pages render `LocalBusiness` JSON-LD with correct `groningen` city data
- Integration: full E2E booking flow on staging with Groningen cleaning (book → pay → confirm)
- Manual: Lighthouse audit run and documented
- Manual: GDPR checklist reviewed by human
- Manual: at least 3 real cleaning partners onboarded in staging with real Stripe Connect accounts

### Exit Criteria
- [ ] `groningen` `publicVisible: true`, `status: 'active'` committed and deployed
- [ ] At least 3 SEO landing pages for Groningen cleaning are live
- [ ] Sentry capturing errors in production
- [ ] Lighthouse mobile score ≥ 80 on cleaning booking page
- [ ] Privacy policy and terms reviewed and updated
- [ ] Timezone issue documented (fixed or explicitly accepted as pre-launch risk)
- [ ] At least 3 real cleaning partners onboarded and active in Groningen

---

## Sprint 9 — Production Validation

**Objective:** Execute the first real paid cleaning booking in Groningen. Validate every system component under real conditions.

**Estimated Complexity:** Low (no new code; this is a verification gate)
**Technical Risk:** High — real money, real customers, real partners; Stripe must be in live mode

> **Stripe Live Mode switch** requires explicit written approval from the project owner.
> Do not flip to live mode until all S9 manual tests pass in test mode.

### Product Features
- Stripe switched to live mode
- Real customer books a cleaning service in Groningen
- Real payment processed
- Real partner receives booking notification and payout
- Admin monitors the booking in real-time

### Backend
- `STRIPE_SECRET_KEY`: switch from `sk_test_*` to `sk_live_*` in Vercel production env
- `STRIPE_WEBHOOK_SECRET`: re-register webhook in Stripe live dashboard; update Vercel env
- Stripe Connect: verify all onboarded partners have completed live mode Connect onboarding

### Infrastructure
- Vercel production deployment: confirm all env vars are set (`STRIPE_*`, `SUPABASE_*`, `RESEND_*`, `GOOGLE_MAPS_*`)
- Sentry: confirm errors are routed to correct project + alerting configured
- Monitoring: watch for errors in Sentry dashboard during first booking

### End-to-End Validation Checklist

**Pre-launch (staging, test mode):**
- [ ] Full booking flow: Groningen cleaning partner → customer books → Stripe test payment → confirmed → partner notified
- [ ] Review flow: partner marks completed → customer submits review → admin publishes
- [ ] Admin flow: new partner application → admin approves → partner onboards
- [ ] Cancellation flow: customer cancels → booking cancelled → customer notified → payout NOT triggered
- [ ] Failed payment: test card → booking stays pending → customer sees error
- [ ] Duplicate webhook: fires twice → no duplicate payment record

**Production switch:**
- [ ] Stripe live mode keys set in Vercel production env
- [ ] Webhook re-registered and live webhook secret updated
- [ ] Test booking with real card (own card; refund immediately)
- [ ] Confirm real email received (customer + partner)
- [ ] Confirm payment appears in Stripe live dashboard
- [ ] Confirm payout schedule configured for cleaning partners

**First real booking:**
- [ ] Real customer completes booking
- [ ] Real Stripe payment processed
- [ ] Partner receives "Nieuwe boeking" email
- [ ] Customer receives "Boeking bevestigd" email
- [ ] Booking visible in admin dashboard
- [ ] Partner confirms service delivery → booking marked `completed`
- [ ] Review request sent to customer

### Exit Criteria
- [ ] First real paid cleaning booking in Groningen completed
- [ ] Zero critical errors in Sentry during first booking
- [ ] Payout initiated to cleaning partner
- [ ] Review submitted and published

### LAUNCH ✓

---

## Launch Checklist

### Technical Readiness
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — zero errors
- [ ] All 9 sprint exit criteria met
- [ ] `groningen` city `publicVisible: true` committed
- [ ] Stripe live mode active
- [ ] All production env vars set in Vercel
- [ ] Sentry monitoring active
- [ ] Webhook registered in Stripe live dashboard

### Provider Readiness
- [ ] ≥3 cleaning partners onboarded in Groningen
- [ ] All partners have completed Stripe Connect onboarding (live mode)
- [ ] All partners have set weekly availability schedule
- [ ] All partners have configured their cleaning services with prices

### Legal & Compliance
- [ ] Privacy policy updated for Groningen + cleaning
- [ ] Terms of service cover cleaning services
- [ ] Cookie consent banner active on all pages
- [ ] GDPR review completed by human

### Content & SEO
- [ ] ≥3 Groningen cleaning SEO landing pages live
- [ ] JSON-LD structured data on all landing pages
- [ ] Dutch-primary metadata on all pages
- [ ] Sitemap updated

### Operations
- [ ] Admin knows how to approve a new partner application
- [ ] Admin knows how to manually cancel a booking if needed
- [ ] Cancellation policy visible to customers (link to terms or direct copy)
- [ ] Emergency contact plan: what happens if Stripe webhook fails at 10pm

---

## Critical Path Summary

| Sprint | Duration Estimate | Depends On | Parallel With |
|---|---|---|---|
| S1 — Platform Core | 1 day | — | — |
| S2 — Cleaning Category | 2 days | S1 | — |
| S3 — Partner Portal | 3 days | S2 | S4 |
| S4 — Booking Flow | 3 days | S2 | S3 |
| S5 — Payments | 1 day | S4 | — |
| S6 — Reviews | 2 days | S5 | S7 |
| S7 — Admin | 2 days | S3 | S6 |
| S8 — Launch Prep | 4 days | S6 + S7 | — |
| S9 — Production Validation | 2 days | S8 | — |
| **Total Critical Path** | **~15 working days** | | |

> Duration estimates assume one focused developer. Testing and review add 20–30%.

---

## What Is the Minimum Implementation Before Accepting the First Real Customer?

**Answer: 7 hard requirements. Nothing else.**

---

### 1. Groningen city is public

`lib/cities.ts`: `status: 'active'`, `publicVisible: true` for `groningen`.
Without this, no customer can find any Groningen provider.

### 2. At least 1 active, verified cleaning partner in Groningen

`providers` record: `city: 'groningen'`, `is_active: true`, `is_verified: true`.
Partner must have at least 1 `provider_services` row linked to a cleaning service.
Partner must have a weekly availability schedule set.
Without this, there is no one to book.

### 3. Booking flow accepts a cleaning booking

Steps: service selection → Groningen address → date/time → confirm.
`actions.ts` must correctly INSERT a cleaning booking via `createServiceRoleClient()`.
Stripe Checkout session must be created with correct amount.
Without this, customers cannot complete a booking.

### 4. Stripe is in live mode with a valid webhook

`STRIPE_SECRET_KEY` = `sk_live_*`.
Webhook registered in Stripe live dashboard.
`payment_intent.succeeded` transitions booking to `confirmed`.
Without this, no real payment can be accepted.

### 5. Confirmation emails reach both parties

Customer receives "Boeking bevestigd" email via Resend.
Partner receives "Nieuwe boeking" email via Resend.
Without this, the booking is invisible to both parties.

### 6. Admin can see the booking

Admin dashboard shows the booking with correct status.
Admin can cancel it manually if something goes wrong.
Without this, there is no operational safety net.

### 7. Privacy policy is live and covers cleaning

Dutch privacy policy page accessible from footer.
Mentions cleaning services and Groningen.
GDPR cookie consent banner active.
Without this, operating in the Netherlands is not legally compliant.

---

### What Does NOT Block the First Booking

These are real needs but none of them prevent a first booking:

| Item | Can Launch Without? | When to Add |
|---|---|---|
| Self-service cancellation (currently email) | ✅ Yes | Sprint 8 or post-launch |
| Multiple SEO landing pages | ✅ Yes (1 is enough) | Sprint 8 |
| Review system | ✅ Yes | Sprint 6, before second booking ideally |
| Provider earnings dashboard | ✅ Yes | Already built |
| Load testing | ✅ Yes | After first 10 real bookings |
| Timezone winter fix | ✅ Yes (if launching before Nov) | Must fix before October clock change |
| Sentry monitoring | ✅ Technically yes | Strongly recommended before launch |
| Second cleaning partner | ✅ Yes (1 partner is enough) | Before capacity matters |
| Recurring bookings | ✅ Yes (MVP is one-off) | Phase 2 |
| B2B / team management | ✅ Yes | Phase 2 |
| Amsterdam / Rotterdam | ✅ Yes | Phase 2 |

**The minimum is 7 requirements. If all 7 pass, launch. Everything else is product improvement.**

---

*Last updated: 2026-07-01 — CTO execution document. Update after each sprint completion.*
