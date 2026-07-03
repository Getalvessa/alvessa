# Sprint 3.5 — Groningen Cleaning MVP Integration Audit

> **Audit type:** Read-only end-to-end integration audit.
> **No files were modified.** No migrations were run. No SQL executed.
>
> **Auditor:** CTO / Lead Engineer
> **Date:** 2026-07-02
> **Scope:** Full funnel — Landing → Form → DB → Dashboard → Provider Profile → Booking Flow
> **Repository state:** Sprint 1 ✅ + Sprint 2 ✅ + Sprint 3 ✅ applied

---

## 1. Executive Summary

The Groningen Cleaning MVP is **structurally complete** at the backend and provider-management
layers. Every critical system — booking engine, Stripe payment, availability API, email
notifications, provider dashboard, and admin dashboard — is **category-agnostic by design** and
handles cleaning bookings without modification.

Two layers require attention before public launch:

**Layer A — Public-facing copy (pre-launch requirement):**
The public provider listing page (`/aanbod`), individual provider profile page, booking flow
notes label, and booking success page all contain **massage-specific i18n strings** that will
be shown to cleaning customers once Groningen becomes `publicVisible: true`. These are
**non-blocking for the internal pilot** (Groningen is currently hidden) but are **blocking
for Sprint 8** (public launch flip).

**Layer B — Application funnel copy (immediate, low-effort):**
The application form's `service_types` field displays massage-specific label and placeholder to
all applicants including cleaning partners. The `isCleaningApplicant` conditional label
(Sprint 3-C) will rarely trigger in practice because cleaning applicants naturally type Dutch
words ("schoonmaak") while the trigger requires the English word "cleaning".

**Summary verdict:**

| Scope | Status |
|---|---|
| Internal pilot (admin-invited partners, Groningen hidden) | ✅ GO |
| First real cleaning booking (technical flow) | ✅ Capable |
| Public launch (Groningen `publicVisible: true`) | ⚠️ NO-GO — 8 i18n keys + 2 code lines block |

---

## 2. End-to-End Flow Diagram

```
Stage 1: Landing Page (/voor-schoonmakers)
   ✅ Complete — correct cleaning copy, Groningen launch note, CTA functional
   ⚠️ CTA links to /voor-masseurs/aanmelden (URL branding debt)
         │
         ▼
Stage 2: Application Form (/voor-masseurs/aanmelden)
   ⚠️ Partial — form backend is category-agnostic and stores correctly
                 but service_types label/placeholder shows massage copy
                 → isCleaningApplicant rarely triggers in practice
         │
         ▼
Stage 3: Database Write (provider_applications)
   ✅ Complete — Groningen slug accepted, service_types stored verbatim,
                 service_mode correctly handled, city CHECK constraint updated
         │
         ▼
Stage 4: Admin Dashboard (approve + manage)
   ✅ Complete — applications list shows city (Groningen) + raw service_types
                 approve action correctly maps city + service_mode to provider row
         │
         ▼
Stage 4b: Provider Dashboard (self-service setup)
   ✅ Complete — category-filtered diensten ✅, availability ✅, profiel ✅
                 booking list uses snapshots (category-agnostic) ✅
         │
         ▼
Stage 5: Public Provider Profile (/aanbod/[slug])
   ⚠️ Partial — profile loads correctly for cleaning provider
                 but meta title fallback and description fallback are hardcoded "massage"
                 founderBadge says "Founding Therapeut" (not "Partner")
                 BLOCKED until publicVisible=true — not visible in current state
         │
         ▼
Stage 6: Booking Flow (/aanbod/[slug]/boeken)
   ⚠️ Partial — booking creation is fully category-agnostic ✅
                 Stripe session is category-agnostic ✅
                 notesLabel says "voor de therapeut" (cleaning customers see "therapeut")
                 notesPlaceholder has massage-specific content ("voorkeur voor druk")
                 notesPlaceholderCleaning exists but not yet wired in (Sprint 4)
                 BLOCKED until publicVisible=true — flow unreachable for Groningen
         │
         ▼
Stage 7: Booking Success + Payment
   ⚠️ Partial — payment flow is category-agnostic ✅
                 payment.summaryProvider label says "Masseur"
                 Success page renders service_name_snapshot (category-agnostic) ✅
```

---

## 3. Findings Table

### 3.1 Stage 2 — Application Form

| # | Severity | File | Description | User Impact | Recommended Sprint |
|---|---|---|---|---|---|
| F-01 | **Medium** | `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` + `messages/nl.json` | `service_types` field label is `forProviders.applyLabelServices` = "Welke massages bied je aan?". Cleaning applicants read a massage-specific question. | Cleaning applicant confusion; likely types Dutch ("schoonmaak"), not English ("cleaning") | Sprint 4 or Sprint 7 |
| F-02 | **Medium** | `messages/nl.json` + `messages/en.json` | `forProviders.applyLabelServicesPh` placeholder shows massage service examples ("Zweedse massage, diepe weefselmassage, sportmassage"). | Cleaning applicant does not know what to type; may type Dutch words that will not trigger `isCleaningApplicant` | Sprint 4 or Sprint 7 |
| F-03 | **Medium** | `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` | `isCleaningApplicant` trigger requires `'cleaning'` (English substring). Dutch applicants type "schoonmaak" → trigger never fires → experience label stays as "Jaren ervaring" (massage framing). | Feature under-delivers for Dutch-speaking cleaning applicants | Sprint 4 or Sprint 7 |
| F-04 | **Low** | `app/[locale]/voor-masseurs/aanmelden/page.tsx` | Page header renders `forProviders.applyPageTitle` and `forProviders.applyFoundingTitle`. These keys were not audited here but are likely massage-specific. Cleaning partner sees massage-framed header. | Minor trust friction; form still works correctly | Sprint 7 |

---

### 3.2 Stage 5 — Public Provider Profile (Blocked by publicVisible=false — pre-launch debt)

| # | Severity | File | Description | User Impact | Recommended Sprint |
|---|---|---|---|---|---|
| F-05 | **High** | `app/[locale]/aanbod/[slug]/page.tsx` line 111 | Title fallback: `— Massage therapeut in ${cityName} \| Alvessa`. Fires when provider has no active services. A cleaning provider with no service listed would show "Massage therapeut" in Google search results. | Wrong category label in SEO title for cleaning providers | Sprint 8 (before publicVisible=true) |
| F-06 | **High** | `app/[locale]/aanbod/[slug]/page.tsx` line 125 | Description fallback: `` `Boek gecertificeerde ${serviceNames \|\| 'massage'} ...` ``. When `serviceNames` is empty, description says "massage". | Wrong category in SEO description for cleaning providers | Sprint 8 |
| F-07 | **High** | `messages/nl.json` + `messages/en.json` | `providers.pageTitle` = "Masseurs in Utrecht", `providers.pageSubtitle` = "Gecertificeerde massagetherapeuten in Utrecht". Shown on `/aanbod` listing page. Once Groningen goes public and cleaning providers appear, customers see "Masseurs in Utrecht" for all providers including cleaners. | Customers searching for cleaners see massage-specific listing page | Sprint 8 |
| F-08 | **High** | `messages/nl.json` + `messages/en.json` | `providers.metaTitle` = "Masseurs in Utrecht — Alvessa", `providers.metaDescription` references massage. Used in `<head>` for the `/aanbod` page. | SEO mismatch — Google indexes "masseurs" for a page listing cleaning providers | Sprint 8 |
| F-09 | **Medium** | `messages/nl.json` + `messages/en.json` | `providers.profileMetaTitle` = "{name} — Massagetherapeut in Utrecht — Alvessa". Applied to every provider profile page. Cleaning provider "Jan de Vries" gets title "Jan de Vries — Massagetherapeut in Utrecht — Alvessa". | SEO mislabeling for cleaning providers | Sprint 8 |
| F-10 | **Medium** | `messages/nl.json` + `messages/en.json` | `providers.profileMetaDescription` = "Boek een massage bij {name} in Utrecht." Used for all provider profiles. | SEO mislabeling for cleaning providers | Sprint 8 |
| F-11 | **Medium** | `messages/nl.json` + `messages/en.json` | `providers.founderBadge` = "Founding Therapeut". Shown on provider card and profile for any provider with `is_founding_therapist=true`. A founding cleaning partner would display "Founding Therapeut". | Incorrect label — cleaning partner is not a "therapeut" | Sprint 8 |
| F-12 | **Medium** | `messages/nl.json` | `providers.reviewsEmpty` = "Er zijn nog geen beoordelingen voor deze therapeut." "Therapeut" is massage-specific. | Minor copy inconsistency on cleaning provider profile | Sprint 8 |
| F-13 | **Medium** | `messages/nl.json` | `providers.emptyTitle` = "Nog geen masseurs beschikbaar". `providers.emptyDesc` references Utrecht therapists. Shown when no providers match. Once Groningen goes public with cleaning providers, a cleaning search could show "Nog geen masseurs" if no cleaning providers are active. | Confusing empty state for cleaning customers | Sprint 8 |

---

### 3.3 Stage 6 — Booking Flow (Blocked by publicVisible=false — pre-launch debt)

| # | Severity | File | Description | User Impact | Recommended Sprint |
|---|---|---|---|---|---|
| F-14 | **Medium** | `messages/nl.json` + `messages/en.json` | `booking.notesLabel` = "Notities voor de therapeut (optioneel)". Shown in Step 3 of the booking flow for ALL bookings. A cleaning customer sees "therapeut" instead of "schoonmaker". | Minor but visible category mislabeling during booking | Sprint 4 |
| F-15 | **Medium** | `messages/nl.json` + `messages/en.json` | `booking.notesPlaceholder` = "Bijv. bellcode, etage, voorkeur voor druk..." — "voorkeur voor druk" means massage pressure preference. Not relevant for cleaning. `notesPlaceholderCleaning` exists but is not yet wired into `booking-flow.tsx`. | Cleaning customer sees massage-specific placeholder | Sprint 4 |
| F-16 | **Low** | `messages/nl.json` | `payment.summaryProvider` = "Masseur". Displayed on the booking success page summary alongside provider name and service. A cleaning customer's confirmation screen says "Masseur: Jan de Vries". | Minor label mismatch on confirmation page | Sprint 8 |

---

### 3.4 Stage 7 — Cross-System Hardcoded Massage Strings

| # | Severity | File | Line | Description | User Impact | Recommended Sprint |
|---|---|---|---|---|---|---|
| F-17 | **Low** | `app/layout.tsx` | 18–20 | Global default metadata: title "Premium massage aan huis in Utrecht", description "masseur/massage therapeuten". These are site-wide fallbacks, not page-specific. | Shown only when page-level metadata is absent (unlikely). Background SEO issue. | Sprint 8 |
| F-18 | **Low** | `app/manifest.ts` | 5 | PWA manifest `name` = "Alvessa — Massage aan huis", `description` = "Premium massage aan huis in Utrecht". Shown in PWA install prompts and browser tabs on Android/iOS. | A Groningen cleaning customer installing the PWA sees "Massage aan huis" | Sprint 8 |
| F-19 | **Low** | `app/[locale]/page.tsx` | 27, 43 | Homepage hardcoded: description "Premium massage in Utrecht", JSON-LD `serviceType` = "Massagetherapie in Utrecht". | Homepage remains Utrecht massage until a multi-city homepage is built | Sprint 8 |
| F-20 | **Low** | `lib/types/marketplace.ts` | 2, 8, 25 | Comments reference "massage therapists in MVP", "only massage active in MVP". Documentation drift — types themselves are correct. | Zero user impact; documentation debt only | Any sprint (trivial) |

---

### 3.5 Verified as Category-Agnostic (No Issues)

| Component | Verification | Notes |
|---|---|---|
| `supabase/migrations/202607010001` | ✅ | Cleaning category + Groningen seeded correctly |
| `lib/cities.ts` groningen entry | ✅ | `recruitmentVisible: true`, `publicVisible: false` — correct |
| `app/[locale]/voor-masseurs/aanmelden/actions.ts` | ✅ | Service_types stored verbatim; city validated via `isRecruitmentCitySlug()` |
| `app/[locale]/admin/aanbieders/actions.ts` (approve) | ✅ | `city: app.city` → Groningen correctly passed; `service_mode` correctly resolved |
| `app/[locale]/admin/aanbieders/applications-list.tsx` | ✅ | Shows raw `service_types` text; `getCityDisplayName()` handles Groningen |
| `app/[locale]/dashboard/diensten/page.tsx` | ✅ | S2-B category filter active; cleaning provider sees only cleaning services |
| `app/[locale]/dashboard/boekingen/page.tsx` | ✅ | Uses `service_name_snapshot` — category-agnostic |
| `app/[locale]/dashboard/beschikbaarheid/page.tsx` | ✅ | No category-specific code |
| `app/[locale]/dashboard/profiel/page.tsx` | ✅ | No massage-specific code |
| `lib/providers/public.ts` | ✅ | City gate uses `getPublicCitySlugs()` — Groningen correctly excluded |
| `app/[locale]/aanbod/[slug]/boeken/actions.ts` | ✅ | All financial values from DB; Stripe session category-agnostic; appointment_type validated against provider's service_mode |
| `app/api/availability/route.ts` | ✅ | Duration-agnostic loop; 3–5h cleaning slots handled correctly (verified Sprint 2) |
| `app/api/stripe/webhook/route.ts` | ✅ | Category-agnostic; `payment_intent.succeeded` transitions any booking to `confirmed` |
| Email notifications (Resend) | ✅ | Uses `service_name_snapshot` — cleaning service name appears correctly |
| `app/[locale]/boeken/succes/page.tsx` | ✅ (partial) | Success page uses snapshots — category-agnostic for service name; only `payment.summaryProvider` label is massage-specific (F-16) |
| `app/[locale]/admin/boekingen/bookings-table.tsx` | ✅ | Uses `service_name_snapshot` — shows cleaning service name correctly |
| `platform_fee_cents: 0` | ✅ (intentional) | MVP placeholder — Sprint 5 must configure cleaning commission rate before live mode |

---

## 4. Special Finding — `customer_notes` vs `address_notes`

The Sprint 2 audit specified storing property type in `bookings.customer_notes`. However,
the current booking flow implementation stores address-step notes in `bookings.address_notes`.
The `notesPlaceholderCleaning` key (prepared in Sprint 3) is intended for the address step
notes field — which maps to `address_notes`, not `customer_notes`.

**Impact:** None. Both columns are nullable freetext. Property type information will arrive in
`address_notes` — which is visible in the provider dashboard booking detail. The schema has
both columns; `customer_notes` remains NULL for cleaning bookings in the current flow.

**Recommendation:** When Sprint 4 wires up the placeholder, use `address_notes` (which is already
the field the AddressStep submits). Do not add a separate `customer_notes` mapping unless Sprint 4
explicitly adds a dedicated property type field.

---

## 5. `isCleaningApplicant` Trigger — Practical Assessment

The condition in `application-form.tsx`:
```typescript
const isCleaningApplicant =
  selectedCity === 'groningen' &&
  selectedServiceTypes.toLowerCase().includes('cleaning');
```

**Logic:** ✅ Correct for 9/9 simulated cases.

**Practical limitation:** The `service_types` field that `selectedServiceTypes` tracks is
labeled "Welke massages bied je aan?" with placeholder "Bijv. Zweedse massage, diepe
weefselmassage, sportmassage…". Dutch-speaking cleaning applicants will almost certainly type:

- "schoonmaak" → trigger: false
- "Schoonmaakdiensten" → trigger: false
- "huishoudelijke hulp" → trigger: false
- "interieurverzorging" → trigger: false
- "cleaning" → trigger: **true** ✅ (only if applicant types English)

**None of the Dutch cleaning service descriptors contain the substring 'cleaning'.** The
condition will fire only if the applicant happens to type the English word. For a Dutch-speaking
applicant guided by a Dutch-language form, this is unlikely.

**Root cause:** The label and placeholder for `service_types` were not made conditional in
Sprint 3. Making them conditional requires the same `isCleaningApplicant` state that was added —
the infrastructure is already in place. The fix is 4 lines of code + 4 i18n keys.

---

## 6. Go / No-Go Assessment

### Question: Is the Groningen Cleaning MVP capable of accepting real providers and completing the intended workflow?

**Answer: YES — for an internal pilot. NO — for a public launch.**

---

### ✅ Internal Pilot Capability (Groningen `publicVisible: false`)

The following end-to-end workflow is **fully functional today** for admin-managed onboarding:

```
1. Admin recruits cleaning partner directly (phone/email) — bypasses form entirely
2. Admin opens /voor-masseurs/aanmelden and guides partner through application
3. Partner submits application with service_types = "cleaning" (English) or any text
4. Admin approves application → provider row created with city='groningen', service_mode='mobile_only'
5. Partner logs in → Dashboard is fully functional for cleaning
6. Partner navigates to /dashboard/diensten → sees only cleaning services (S2-B filter) ✅
7. Partner configures availability at /dashboard/beschikbaarheid ✅
8. Partner profile is created — not publicly visible (publicVisible=false)
9. Admin can see partner in admin dashboard ✅
10. Admin manually manages any test bookings
```

**All 10 steps work today without any code change.**

---

### ⚠️ Minimum Remaining Work Before Public Launch (Sprint 8)

These are the items that BLOCK `publicVisible: true` for Groningen cleaning:

**Group A — Critical (public-facing category mislabeling):**

| Item | Files | Effort |
|---|---|---|
| Fix `/aanbod` listing page title/meta (F-07, F-08) | `messages/nl.json`, `messages/en.json` | 4 key updates |
| Fix provider profile meta title/description (F-09, F-10) | `messages/nl.json`, `messages/en.json` | 4 key updates |
| Fix page title hardcoded fallback "Massage therapeut" (F-05) | `app/[locale]/aanbod/[slug]/page.tsx` | 2 lines |
| Fix description fallback `\|\| 'massage'` (F-06) | `app/[locale]/aanbod/[slug]/page.tsx` | 1 line |

**Group B — Medium (booking flow and confirmation):**

| Item | Files | Effort | Sprint |
|---|---|---|---|
| Wire `notesPlaceholderCleaning` into AddressStep (F-15) | `booking-flow.tsx` | ~8 lines | Sprint 4 |
| Make `notesLabel` conditional for cleaning (F-14) | `messages/nl.json`, `booking-flow.tsx` | 2 lines + 2 i18n keys | Sprint 4 |
| Fix `founderBadge` text for cleaning partners (F-11) | `messages/nl.json` | 1 key | Sprint 8 |
| Fix `payment.summaryProvider` "Masseur" (F-16) | `messages/nl.json` | 1 key | Sprint 8 |

**Group C — Low (application funnel):**

| Item | Files | Effort | Sprint |
|---|---|---|---|
| Make `service_types` label/placeholder conditional (F-01, F-02, F-03) | `messages/nl.json`, `application-form.tsx` | 4 lines + 4 i18n keys | Sprint 4 |

---

### Minimum Before First Real Groningen Booking

From `docs/EXECUTION_ROADMAP.md`, the 7 hard requirements for a first real booking are:

| Requirement | Current State |
|---|---|
| 1. Groningen `publicVisible: true` | ❌ false — Sprint 8 flip |
| 2. At least 1 active, verified cleaning partner | ❌ None yet — Sprint 3 enables recruitment |
| 3. Booking flow accepts a cleaning booking | ✅ Technically yes (post Sprint 4 cleanup) |
| 4. Stripe live mode + valid webhook | ❌ Sprint 5 + Sprint 9 |
| 5. Confirmation emails to both parties | ✅ Infrastructure ready |
| 6. Admin can see the booking | ✅ Ready |
| 7. Privacy policy covers cleaning | ❌ Not yet updated — Sprint 8 |

**Before the first real booking, all Group A + Group B items must be resolved** to prevent
cleaning customers from seeing "Masseur" and "Massagetherapeut" labels throughout their
experience.

---

## 7. Findings Summary by Stage

| Stage | Status | Blocking Now? | Blocking at Launch? |
|---|---|---|---|
| 1. `/voor-schoonmakers` landing | ✅ Complete | No | Minor (CTA URL) |
| 2. Application form | ⚠️ Partial | No (form stores correctly) | Low (cleaning label rarely triggers) |
| 3. Database write | ✅ Complete | No | No |
| 4. Admin dashboard | ✅ Complete | No | No |
| 4b. Provider dashboard | ✅ Complete | No | No |
| 5. Public provider profile | ⚠️ Partial | No (hidden by publicVisible=false) | **Yes — Group A fixes required** |
| 6. Booking flow | ⚠️ Partial | No (unreachable for Groningen) | Yes — Group B fixes (Sprint 4) |
| 7. Cross-system strings | ⚠️ Partial | No | Low–Medium |

---

*Audit complete. No files were modified. Awaiting Sprint 4 approval.*
