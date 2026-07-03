# Sprint 3 Implementation Audit — Partner Portal

> **Audit type:** Read-only pre-implementation analysis.
> No code was modified. No migrations were written. No SQL was executed.
>
> **Audit scope:** Every file Sprint 3 will require touching.
> **Stop condition:** Audit complete. Awaiting task selection and approval before any code change.
>
> **Auditor:** CTO / Lead Engineer
> **Date:** 2026-07-02
> **Foundation version:** v2.2.1 (frozen)
> **Repository state:** Sprint 1 ✅ complete + Sprint 2 ✅ complete (S2-C deferred per S2C_MVP_VALIDATION.md)

---

## Executive Summary

Sprint 3 is **correctly scoped** and technically low-risk. Its sole objective is enabling the
first real cleaning partner to discover the platform, apply, and complete onboarding. The
existing provider dashboard (booking management, availability, services, earnings, Stripe Connect)
requires **zero modification** — it already supports cleaning partners without category-specific changes.

Sprint 3 is therefore almost entirely **copy + config + one new marketing page**. The Sprint 3
critical path item is unblocking partner recruitment so the first cleaning partner can be onboarded
before Sprint 4 (booking flow) and Sprint 5 (payments) complete.

**Sprint 2 deliverables confirmed:**

| Deliverable | Status | Evidence |
|---|---|---|
| S2-A: `cleaning.*` i18n namespace | ✅ Complete | `messages/nl.json` top-level `cleaning` key with 8 sub-keys |
| S2-B: Dashboard services category filter | ✅ Complete | `category_id`, `enabledCategoryIds` logic in `dashboard/diensten/page.tsx` |
| S2-C: PropertyTypeSelector component | ⏸️ Deferred | Per `docs/S2C_MVP_VALIDATION.md` — resolved in Sprint 3 |
| `booking.notesPlaceholderCleaning` key | ⚠️ Missing | Listed as "Immediate action" in S2C validation doc — not yet added |

**Total files requiring change in Sprint 3: 4 (plus 1 new page, 0 migrations, 0 RLS changes).**

---

## Sprint 2 → Sprint 3 Handoff State

### What Sprint 2 completed

- `cleaning.*` i18n namespace added (8 keys including `propertyTypeLabel`, `propertyTypeApartment`,
  `propertyTypeHouse`, `propertyTypeStudio`, `propertyTypeOffice`, `bookingNote`, `summaryPropertyType`,
  `services.*`)
- Dashboard `diensten` page filters services by `category_id` — a cleaning partner sees only
  cleaning services; a massage provider sees only massage services ✅
- 5 cleaning services seeded in DB with correct durations and prices (Sprint 1) ✅
- Groningen city registered, `publicVisible: false`, `recruitmentVisible: true` (Sprint 1) ✅
- Build passes: `npm run lint && npm run build` ✅

### What Sprint 2 left unresolved

| Item | Status | Sprint 3 action |
|---|---|---|
| `booking.notesPlaceholderCleaning` i18n key | Not added | Add in S3-D (trivial, 2 lines) |
| PropertyTypeSelector component | Deferred to S3 | Re-evaluated below — remain deferred to Sprint 4 |
| `/voor-schoonmakers` recruitment page | Not started | Build in S3-A |
| Provider application form cleaning question | Not started | Build in S3-C |
| `forCleaners.*` i18n namespace | Not started | Build in S3-B |

---

## Repository Analysis — Sprint 3 Impact Assessment

| Module | Files in Scope | Affected by Sprint 3 | Risk |
|---|---|---|---|
| New marketing page | `app/[locale]/voor-schoonmakers/page.tsx` | 1 new | Low |
| i18n copy | `messages/nl.json`, `messages/en.json` | 2 (new `forCleaners.*` namespace + 1 deferred key) | Low |
| Provider application form | `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` | 1 (conditional cleaning question) | Low |
| Booking flow (AddressStep) | `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx` | 1 minimal (cleaning notes placeholder) | Low-Medium |
| All security/RLS/migration files | `supabase/migrations/*` | 0 — no schema change | None |
| Provider dashboard | All `dashboard/*` pages | 0 — already category-agnostic ✅ | None |
| Admin dashboard | All `admin/*` pages | 0 — Sprint 7 scope | None |
| Stripe webhook / Booking actions | `actions.ts`, `webhook/route.ts` | 0 | None |

---

## Sprint 3 Sub-Task Decomposition

### S3-A — `/voor-schoonmakers` Recruitment Landing Page (Subsystem F)

**Objective:** Create the cleaning partner recruitment landing page for Groningen.

**Purpose:**
A cleaning partner searching for work in Groningen has no entry point to the platform. The
existing `/voor-masseurs` page is written entirely in massage-specific language ("masseur",
"therapeut", "wellness") and references Utrecht. Cleaning partners landing on this page
immediately understand it is not for them and leave.

Without this page, Sprint 3 has no way to recruit its first cleaning partner.

**Business value:**
Direct: enables partner recruitment funnel.
Indirect: blocks the first real Groningen booking until at least 1 partner is onboarded.
This page is a critical path item.

**MVP validation:**
- Required before the first Groningen provider? ✅ YES — this is the recruitment channel
- Required before the first Groningen customer? Indirectly yes (need a provider first)
- Can it be postponed? Only if recruitment happens via direct admin invitation with no self-service
  apply flow. Possible for 1–2 partners but does not scale past the first cohort.

**Technical approach:**
Model on `app/[locale]/voor-masseurs/page.tsx`. Key adaptations:
- Page title: "Word schoonmaakpartner in Groningen" or equivalent
- Copy explains cleaning partner terms (not massage)
- CTA: link to existing application form at `/voor-masseurs/aanmelden/`
  with `?city=groningen&serviceType=cleaning` query params for pre-fill (no form logic change —
  the form reads `searchParams` already via `useSearchParams`)
- No auth required — public page

**Files:**
- `app/[locale]/voor-schoonmakers/page.tsx` — NEW FILE (1 file, ~80–100 lines)

**i18n dependency:**
Requires S3-B `forCleaners.*` namespace to be complete first.

**Estimated complexity:** Low
**Estimated risk:** Low — new static marketing page, no mutations, no auth, no payments
**Architecture impact:** None — follows existing public page pattern
**Subsystem:** F (Public Marketing Pages)
**Build check required:** Yes (`npm run lint && npm run build`)
**Blocks first real customer:** Indirectly — blocks first partner which blocks first customer

---

### S3-B — i18n Copy: `forCleaners.*` Namespace (Subsystem C)

**Objective:** Add `forCleaners.*` namespace to both message files. Add deferred
`booking.notesPlaceholderCleaning` key.

**Purpose:**
`/voor-schoonmakers` page renders all copy via `useTranslations`. Without these keys the
page cannot compile. This task is a prerequisite for S3-A.

**Business value:**
Enabling copy. No business function without S3-A.

**MVP validation:**
- Required before first provider? ✅ YES (S3-A depends on it)
- Can it be postponed? No — S3-A cannot ship without it

**Key spec — `forCleaners.*` namespace:**

```json
"forCleaners": {
  "metaTitle": "Word schoonmaakpartner in Groningen | Alvessa",
  "metaDescription": "Bied je schoonmaakdiensten aan via Alvessa in Groningen. Stel je eigen tarief in, kies je beschikbaarheid en ontvang directe betalingen.",
  "pageTitle": "Word schoonmaakpartner in Groningen",
  "pageSubtitle": "Bied je diensten aan, stel je eigen rooster in en ontvang betalingen via Alvessa.",
  "benefitsTitle": "Waarom partner worden bij Alvessa?",
  "benefit1Title": "Flexibel rooster",
  "benefit1Desc": "Jij bepaalt wanneer je beschikbaar bent. Geen vaste diensten, geen werkgever.",
  "benefit2Title": "Directe uitbetaling",
  "benefit2Desc": "Ontvang je verdiensten automatisch via Stripe na elke voltooide boeking.",
  "benefit3Title": "Geen acquisitie",
  "benefit3Desc": "Alvessa zorgt voor klanten in Groningen. Jij zorgt voor de schoonmaak.",
  "requirementsTitle": "Wat vragen wij?",
  "req1": "Minimaal 1 jaar schoonmaakervaring (particulier of zakelijk)",
  "req2": "Eigen schoonmaakmiddelen en materiaal",
  "req3": "Bereidheid om in Groningen en omgeving te werken",
  "req4": "Een actief bankrekeningnummer (voor Stripe Connect)",
  "ctaButton": "Aanmelden als schoonmaakpartner",
  "applyCityHelper": "Je meldt je aan voor Groningen. Werken in andere steden volgt zodra we uitbreiden.",
  "cityEvaluationNote": "Alvessa is momenteel actief in Utrecht en lanceert binnenkort in Groningen."
}
```

**Key spec — `booking.*` (additive — deferred S2 mitigation):**

```json
"booking": {
  "notesPlaceholderCleaning": "Bijv. appartement of woonhuis, bellcode, verdieping, bijzonderheden voor de schoonmaker."
}
```

This key resolves the S2C_MVP_VALIDATION.md "Immediate action" item. It is used in S3-E
(AddressStep conditional placeholder).

**Files:**
- `messages/nl.json` — add `forCleaners.*` namespace + `booking.notesPlaceholderCleaning`
- `messages/en.json` — English equivalents

**Estimated complexity:** Low
**Estimated risk:** Low — copy only; worst case is a typo
**Architecture impact:** None
**Subsystem:** C (i18n / Copy)
**Build check required:** No (copy-only, per AI_WORKFLOW.md)

---

### S3-C — Provider Application Form: Cleaning Experience Question (Subsystem D)

**Objective:** When a provider applicant selects `groningen` as their city AND includes
`cleaning` in their service types, show one additional field: "Hoeveel jaar schoonmaakervaring?"

**Purpose:**
The current application form captures: name, email, phone, city, service types, service mode,
experience years, Instagram/website, message. The `experience_years` field already exists in
the schema and form. For cleaning applicants, this field's label and placeholder are
massage-framed ("hoeveel jaar als therapeut"). A conditional label change for cleaning applicants
is the minimal fix.

**Business value:**
Admin receives better-qualified applications from cleaning partners. The conditional question
makes it clear the form is aware of their context.

**MVP validation:**
- Required before first Groningen provider? Soft yes — admin can manually filter but better UX
- Required before launch? No — admin can work around it for first cohort
- Can it be postponed? Yes — can defer to Sprint 7 (Admin). Sprint 3 risk of NOT doing it: low
  for 1–3 partners; moderate at 10+ applicants per week.

**Recommendation:** Include in Sprint 3. It is a conditional label change, not a new field.

**Technical approach:**
In `application-form.tsx`, add a derived boolean:
```typescript
const isCleaningApplicant =
  selectedCity === 'groningen' &&
  selectedServiceTypes.includes('cleaning');
```

Use it to conditionally render:
- `experienceYears` label: "Schoonmaakervaring (jaren)" instead of "Jaren ervaring als therapeut"
- `experienceYears` placeholder: "Bijv. 3 jaar particulier, 1 jaar zakelijk"

**Schema impact:** None — `provider_applications.experience_years` column exists, is an integer,
and is already nullable. No migration required.

**Files:**
- `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` — conditional label/placeholder

**Estimated complexity:** Low (4–6 line change + 1–2 new i18n keys)
**Estimated risk:** Low — client-side label change; no schema, no RLS, no auth
**Architecture impact:** None
**Subsystem:** D (Provider Dashboard / Forms)
**Build check required:** Yes (`npm run lint && npm run build`)
**Blocks first real customer:** Indirectly (partner quality signaling)

---

### S3-D — Deferred S2 Item: `booking.notesPlaceholderCleaning` (Subsystem C)

**Objective:** Add the missing key from `docs/S2C_MVP_VALIDATION.md` "Immediate action" item.

**Purpose:**
This is a 2-line copy addition deferred from Sprint 2. It was explicitly listed as "Immediate
action" in the S2C validation document. The key provides cleaning-appropriate placeholder text
for the address notes field in the booking flow Step 3. It is harmless to add now as preparation,
even if the conditional rendering logic ships in Sprint 4.

**Business value:**
Minimal on its own. Enables Sprint 4 (S4 AddressStep conditional placeholder) with zero
marginal cost in Sprint 3.

**Files:**
- `messages/nl.json` — already listed under S3-B (bundled)
- `messages/en.json` — already listed under S3-B (bundled)

**Bundling:** Implement as part of S3-B. Not a separate task.

---

## Files Verified as NOT Affected by Sprint 3

| File | Why Not Affected |
|---|---|
| `supabase/migrations/*` | No new tables. No schema change. Cleaning services, categories, city already seeded ✅ |
| `app/api/stripe/webhook/route.ts` | Category-agnostic. No change. |
| `app/[locale]/aanbod/[slug]/boeken/actions.ts` | Sprint 4 scope — booking flow touches HIGH RISK subsystem |
| `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx` | Sprint 4 scope — Subsystem A, dedicated task required |
| `app/api/availability/route.ts` | Fully duration-agnostic, already verified in Sprint 2 audit ✅ |
| `lib/types/database.ts` | No schema change → no type change |
| `proxy.ts` | Route protection unchanged — dashboard/admin guards already correct |
| All admin pages | Sprint 7 scope |
| `lib/cities.ts` | No change — Groningen already registered with `recruitmentVisible: true` |
| `app/[locale]/dashboard/*` (all pages) | Cleaning partners reuse existing dashboard as-is ✅ |
| `components/booking/property-type-selector.tsx` | See "Features Explicitly Rejected" — deferred |
| `components/providers/cleaning-service-selector.tsx` | See "Features Explicitly Rejected" — deferred |

---

## Sprint 3 Change Summary

```
FILES TO CREATE:  1  (app/[locale]/voor-schoonmakers/page.tsx)
FILES TO MODIFY:  2  (messages/nl.json, messages/en.json)
                  1  (voor-masseurs/aanmelden/application-form.tsx — conditional label)
FILES TO DELETE:  0
MIGRATIONS:       0
RLS CHANGES:      0
BOOKING CHANGES:  0
PAYMENT CHANGES:  0
AUTH CHANGES:     0
```

| File | Task | Change Type | Complexity | Risk |
|---|---|---|---|---|
| `messages/nl.json` | S3-B | Additive (new `forCleaners.*` + 1 booking key) | Low | Low |
| `messages/en.json` | S3-B | Additive (English equivalents) | Low | Low |
| `app/[locale]/voor-schoonmakers/page.tsx` | S3-A | New file (marketing page) | Low | Low |
| `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` | S3-C | Conditional label/placeholder | Low | Low |

**No file in Sprint 3 has HIGH or CRITICAL architecture impact.**
**No migration is required.**
**No Subsystem A (Booking/Payment) file is touched in Sprint 3.**

---

## Recommended Execution Order

```
S3-B (i18n copy — Subsystem C)
  │
  ▼
S3-A (Voor-schoonmakers page — Subsystem F)    ← depends on S3-B for i18n keys
  │
  ▼
S3-C (Application form cleaning label — Subsystem D)   ← independent; can run parallel with S3-A
  │
  ▼
Sprint 3 Complete
```

S3-B must precede S3-A (i18n keys required at build time).
S3-C is independent and can be done in any order relative to S3-A.

---

## Critical Path Assessment

Sprint 3 is on the **parallel path** with Sprint 4 (Booking Flow):

```
Sprint 2 Complete
      │
      ├─► Sprint 3 (Partner Portal)   → enables partner onboarding
      │                                  NO dependency on Sprint 4
      └─► Sprint 4 (Booking Flow)     → enables customer booking
                    │
                    ▼
              Sprint 5 (Payments)     ← depends on S3 + S4
```

**Sprint 3 does NOT block Sprint 4.** Both can proceed in parallel after Sprint 2.

**Sprint 3 DOES block Sprint 5 indirectly** — Sprint 5 exit criterion requires "at least 1 test
cleaning partner fully onboarded in staging." That onboarding requires the `/voor-schoonmakers`
recruitment funnel (or a direct admin invite). If direct admin invitation is acceptable as
Sprint 3 bypass, Sprint 3 does not block Sprint 5 either. However, the `/voor-schoonmakers`
page is needed before public launch regardless.

---

## Technical Debt Review (Post Sprint 2)

| Debt | Origin | Classification | Sprint 3 Action |
|---|---|---|---|
| `booking.notesPlaceholderCleaning` key missing | S2C_MVP_VALIDATION.md "Immediate action" | **Must Fix in Sprint 3** | Added in S3-B |
| `lib/types/marketplace.ts` stale comment (`// 'Utrecht' for MVP`) | Sprint 1 Debt 2 | **Can Wait** | Trivial doc fix; defer opportunistically to Sprint 4 or Sprint 7 |
| `/voor-masseurs/page.tsx` Utrecht/massage-only copy | Sprint 1 Debt 3 | **Can Wait** | Sprint 3 adds `/voor-schoonmakers` as separate page; `/voor-masseurs` remains massage-focused intentionally |
| Cleaning service descriptions not seeded (`description_nl`, `description_en` are NULL) | Sprint 1 Limitation 4 | **Can Wait** | Nullable columns, invisible to booking flow; add descriptions before Sprint 8 SEO/public launch |
| PropertyTypeSelector component (S2-C deferred) | S2C_MVP_VALIDATION.md | **Can Wait** | Sprint 4 scope — bundled with booking flow work where category detection is already needed |
| `booking.notesPlaceholder` massage-specific copy when `notesLabel` says "voor de therapeut" | Implicit after cleaning | **Can Wait** | Conditional rendering deferred to Sprint 4 (`notesLabel` key also needs conditional logic) |

---

## Foundation Compliance Validation

### Configuration over hardcoding ✅

- `/voor-schoonmakers` page uses `useTranslations('forCleaners')` — no hardcoded Dutch strings in JSX
- Application form condition reads city value from state/searchParams — no hardcoded `'groningen'` string
  (uses `isRecruitmentCitySlug()` where possible)
- City architecture: `recruitmentVisible: true` already gating Groningen in `lib/cities.ts`

### Reuse before rebuilding ✅

- Provider dashboard: **zero changes** — cleaning partners use the same dashboard as massage providers
- Application form: **adapted, not rebuilt** — conditional label change on existing form
- `/voor-schoonmakers` **models** the existing `/voor-masseurs` page pattern
- i18n system: **additive namespace** — existing `next-intl` infrastructure unchanged

### Marketplace validation before feature expansion ✅

- Sprint 3 is the minimum needed to recruit the first cleaning partner
- No analytics, no advanced filtering, no multi-partner management, no team features
- One page, one form adaptation, two message files

### Minimal implementation for MVP ✅

- `components/providers/cleaning-service-selector.tsx` removed from scope (existing dashboard sufficient)
- PropertyTypeSelector deferred to Sprint 4 (Option A placeholder is the MVP mitigation)
- No new routes for application form (existing form at `/voor-masseurs/aanmelden/` pre-filled via query params)
- 4 files total. 0 migrations. 0 RLS changes.

---

## MVP Validation Table

| Sprint 3 Feature | Required before first Groningen provider? | Required before first Groningen customer? | Required before launch? | Can postpone without reducing marketplace validation? |
|---|---|---|---|---|
| `/voor-schoonmakers` page (S3-A) | ✅ YES (recruitment channel) | Indirectly yes | ✅ YES | Only if admin recruits directly — not scalable |
| `forCleaners.*` i18n (S3-B) | ✅ YES (S3-A depends on it) | Indirectly yes | ✅ YES | No — S3-A cannot ship without it |
| Application form cleaning question (S3-C) | Soft YES | No | Soft YES | Yes for first 1–3 partners; no at scale |
| `booking.notesPlaceholderCleaning` key (S3-D, bundled in S3-B) | No | No | Soft YES | Yes — operational workaround exists |

---

## Risk Register

### Risk 1 — No Sprint 3 Route Needed for Application Form

**Risk:** The `/voor-schoonmakers` CTA links to `/voor-masseurs/aanmelden/` with query params.
A cleaning partner sees "voor masseurs" in the URL. This creates brand confusion.

**Probability:** Medium — cleaning partners may notice and lose trust.
**Impact:** Low — the form content is generic; only the URL slug is massage-specific.
**Mitigation (Sprint 3 MVP):** Accept brand debt — the form works correctly. This is a known
cosmetic debt. Resolve with a clean `/aanmelden/` or `/voor-schoonmakers/aanmelden/` route in
Sprint 7 or post-launch.
**Do NOT resolve in Sprint 3** — creating a new form route touches Subsystem D more broadly
and is out of Sprint 3 scope.

---

### Risk 2 — `/voor-schoonmakers` Page Mirrors Massage Pricing Model

**Risk:** The `/voor-masseurs` template shows earnings models based on massage pricing (€60–€90/hr).
Copying the structure without adapting the earnings numbers will mislead cleaning partners.

**Probability:** High if copy is not adapted.
**Impact:** Medium — recruits wrong-expectation partners who drop out after seeing real prices.
**Mitigation:** S3-B copy spec explicitly uses cleaning economics. S3-A must NOT copy the
`voor-masseurs` page earnings numbers — all figures must be adapted.

---

### Risk 3 — `application-form.tsx` Type Constraints

**Risk:** The form's `experience_years` field may have type validation that assumes massage
context (e.g., field label rendered from a static string rather than an i18n key).

**Probability:** Low — `voor-masseurs` form was built to use `useTranslations` throughout.
**Impact:** Low — worst case, the label does not conditionally render; fallback is the existing
massage label.
**Mitigation:** Read `application-form.tsx` fully before making any changes (required by
AI_WORKFLOW.md — "read at least once before editing").

---

### Risk 4 — Sprint 3 and Sprint 4 Share a File (booking-flow.tsx)

**Risk:** Sprint 4 will need to modify `booking-flow.tsx` for the cleaning notes placeholder
(using the `notesPlaceholderCleaning` key added in S3-B). If Sprint 3 and Sprint 4 overlap and
both modify `booking-flow.tsx`, merge conflicts could introduce bugs in Subsystem A.

**Probability:** Low — Sprint 3 does NOT touch `booking-flow.tsx`.
**Impact:** Low if sequenced correctly.
**Mitigation:** Sprint 3 adds the i18n key only. Sprint 4 implements the conditional rendering
in `booking-flow.tsx`. These are separate tasks in separate sprints. No overlap.

---

## Sprint 3 Exit Criteria

- [ ] **S3-A**: `/voor-schoonmakers/page.tsx` renders without errors on staging
- [ ] **S3-A**: Page contains CTA linking to `/voor-masseurs/aanmelden/?city=groningen`
- [ ] **S3-B**: `forCleaners.*` namespace present in both `nl.json` and `en.json`
- [ ] **S3-B**: `booking.notesPlaceholderCleaning` key added to both message files
- [ ] **S3-C**: Provider application form shows cleaning-adapted label when city=groningen and service includes cleaning
- [ ] `npm run lint && npm run build` pass with zero errors after S3-A and S3-C
- [ ] At least 1 test cleaning partner can complete the full onboarding path: `/voor-schoonmakers` → apply → admin approves → logs into dashboard → configures cleaning services → sets availability

---

## Deferred Items (Explicitly Not Sprint 3)

### Booking flow property type changes
**Sprint:** Sprint 4
**Rationale:** All `booking-flow.tsx` changes are bundled into Sprint 4 (Booking Flow) where
category detection infrastructure is needed anyway. Touching Subsystem A (HIGH RISK) in a sprint
focused on partner recruitment introduces unnecessary risk and violates the
"one task = one sprint scope" rule.

### `components/providers/cleaning-service-selector.tsx`
**Sprint:** Not planned (removed from scope)
**Rationale:** The existing `/dashboard/diensten` page, after S2-B, already filters services by
`category_id`. A cleaning partner visiting the dashboard sees only the 5 cleaning services.
The existing `services-form.tsx` renders them correctly with individual pricing toggles.
A separate `cleaning-service-selector.tsx` component would duplicate existing functionality
without adding product value. **Removed from Sprint 3 and all future sprints unless a real UX
gap emerges from partner feedback.**

### Admin cleaning filters and Groningen stats
**Sprint:** Sprint 7
**Rationale:** Admin needs category/city filters once there are multiple cities and categories
to manage. At Sprint 3 scale (1–3 partners), admin can visually filter the short bookings list.
The existing admin dashboard supports all necessary Sprint 3 operations.

### Groningen public visibility (`publicVisible: true`)
**Sprint:** Sprint 8
**Rationale:** This is the launch switch. It must not be flipped until all 7 hard requirements
from `docs/EXECUTION_ROADMAP.md` are met. Sprint 3 is about partner recruitment — customers do
not need to see Groningen yet.

### SEO landing pages for Groningen cleaning
**Sprint:** Sprint 8
**Rationale:** SEO pages for a city that is not yet public have no indexable value. These belong
in Sprint 8 alongside the public visibility flip.

### Review system
**Sprint:** Sprint 6
**Rationale:** Reviews require completed bookings to exist. Bookings require Sprint 4 (flow) + Sprint 5 (payments) to complete first. Sprint 6 is the correct home.

### Timezone fix (winter CET vs summer CEST)
**Sprint:** Sprint 8 (or earlier if launch extends into October)
**Rationale:** `TZ_OFFSET_H=2` is hardcoded for CEST (UTC+2). If launch occurs before the
October clock change, this is acceptable. Monitor launch timeline. Add to Sprint 8 if risk
materializes.

### In-app messaging (customer ↔ cleaner)
**Sprint:** Phase 2 (post-launch)
**Rationale:** Not required for booking validation. Out of MVP scope per `docs/MVP_SCOPE.md`.

### Multi-provider team management (cleaning company accounts)
**Sprint:** Phase 2 (post-launch)
**Rationale:** MVP decision is individual cleaners, not cleaning companies. Dashboard supports
this model. Team management is deferred per original Product Vision.

### Recurring booking subscriptions
**Sprint:** Phase 2 (post-launch)
**Rationale:** Not in MVP scope. Individual one-off bookings are the validation target.

---

## Go / No-Go Recommendation

**Recommendation: GO ✅**

**Rationale:**

1. **Sprint 2 is complete.** S2-A, S2-B verified. S2-C correctly deferred per validated
   business reasoning. One small debt (`notesPlaceholderCleaning` key) carried forward and
   resolved in Sprint 3.

2. **Sprint 3 scope is minimal and correct.** 4 files, 0 migrations, 0 RLS changes, 0 Subsystem A
   touches. Every task is Low or Low-Medium complexity.

3. **Foundation compliance verified.** All Sprint 3 tasks follow configuration over hardcoding,
   reuse existing infrastructure, and do not expand MVP scope.

4. **Critical path is unblocked.** Sprint 3 (Partner Portal) and Sprint 4 (Booking Flow) can
   now proceed in parallel. Neither blocks the other.

5. **No blocking technical debt.** The missing `notesPlaceholderCleaning` key is trivial and
   bundled into S3-B. All other debt is correctly classified as "Can Wait."

6. **Risk is low.** The highest-risk items (Subsystem A, new migrations, RLS changes) are all
   deferred to their correct sprints. Sprint 3 touches only public marketing pages, i18n copy,
   and a single conditional label in a form.

---

## Features Explicitly Rejected from Sprint 3

### 1. `PropertyTypeSelector` component (from S2-C)

**Description:** A structured radio-group UI component in booking Step 1 that captures the
property type (apartment / house / studio / office) for cleaning bookings.

**Reason for rejection:**
The `docs/S2C_MVP_VALIDATION.md` analysis confirmed: (a) zero things break technically without
this component, (b) the notes placeholder text (Option A) is a zero-code mitigation that
delivers equivalent operational information, (c) adding a required UI widget at Step 1 of the
booking flow adds conversion friction before the hypothesis of "will customers book cleaners?"
has been validated. Implementing it in Sprint 3 (Partner Portal) would require 6 file changes
across Subsystem A (HIGH RISK) to solve a problem already solved by 2 i18n lines.

**Business impact of rejection:**
Minimal for the first 20 bookings. The cleaner receives property type as a free-text note in
most cases. For blank fields, the operator sends one follow-up message (~2 min/booking at MVP
scale). The operational overhead is acceptable for the validation phase.

**Recommended future sprint:** Sprint 4 (Booking Flow) — bundled with other Subsystem A work.
The category detection infrastructure (`service_categories` join in `fetchProviderForBooking`)
needed for this component is also needed by Sprint 4 for the Groningen address autocomplete
scoping. Zero marginal cost at that point.

---

### 2. `components/providers/cleaning-service-selector.tsx`

**Description:** A new component intended to replace or supplement the existing
`/dashboard/diensten` services list with a cleaning-specific multi-select UI.

**Reason for rejection:**
Sprint 2 (S2-B) already delivers a category-filtered services list in the dashboard. A cleaning
partner visiting `/dashboard/diensten` sees only the 5 cleaning services. The existing
`services-form.tsx` renders per-service pricing toggles that work correctly for cleaning services.
Building a new component would duplicate this functionality with no product benefit. This feature
was speculative in the Sprint 3 roadmap and cannot be justified by a real UX gap (no partners
have yet interacted with the dashboard to surface such a gap).

**Business impact of rejection:**
None. The existing dashboard handles the use case.

**Recommended future sprint:** Only if real partner feedback identifies a specific UX failure in
the existing dashboard services configuration. No planned sprint.

---

### 3. Admin city/category filters for Groningen + Cleaning

**Description:** Filter dropdowns in admin booking and provider tables for
`city: groningen` and `category: cleaning`.

**Reason for rejection:**
At Sprint 3 scale (1–3 onboarding partners, 0 customer bookings yet), the admin can visually
identify all relevant rows in the existing tables. The filtering complexity is not justified until
the dataset grows to 20+ providers or 50+ bookings. Building this now is a premature optimisation.

**Business impact of rejection:**
Negligible. Minor increase in admin time scanning unfiltered tables.

**Recommended future sprint:** Sprint 7 (Admin).

---

### 4. Groningen SEO Landing Pages

**Description:** `/schoonmaak-aan-huis-groningen/`, `/thuisschoonmaak-groningen/`, and
related landing pages.

**Reason for rejection:**
Groningen is `publicVisible: false`. SEO pages for a non-public city have zero indexable value —
search engines cannot reach them through any discoverable link. Building them now wastes time and
leaves dead routes in the codebase.

**Business impact of rejection:**
None until Groningen goes public.

**Recommended future sprint:** Sprint 8 (Launch Prep) — immediately before flipping
`publicVisible: true`.

---

### 5. `/voor-schoonmakers/aanmelden/` dedicated application route

**Description:** A new `/voor-schoonmakers/aanmelden/page.tsx` route with a completely
separate application form adapted specifically for cleaning partners.

**Reason for rejection:**
The existing `/voor-masseurs/aanmelden/` form is generic in logic — it uses `getRecruitmentCities()`
and handles any service type. Sprint 3 uses this form via query params (`?city=groningen`) to
avoid duplicating form logic. The URL `voor-masseurs/aanmelden/` is a minor branding debt, not
a blocking functional problem. Building a full second form route in Sprint 3 would double the
application form codebase (two forms to maintain, two RLS paths to validate, two i18n namespaces
to keep in sync) for zero functional gain at MVP scale.

**Business impact of rejection:**
Minor brand confusion for the URL path during partner recruitment. Cleaning partners who read the
form content (which is generic) are unaffected functionally. Acceptable for a <10 partner cohort.

**Recommended future sprint:** Sprint 7 or post-launch polish. Resolve by creating a proper
generic `/aanmelden/` route that replaces both massage and cleaning application paths.

---

*Audit complete. Sprint 3 implementation requires approval before any code change.*
*Recommended starting task: S3-B (i18n copy) — lowest risk, unblocks S3-A.*
