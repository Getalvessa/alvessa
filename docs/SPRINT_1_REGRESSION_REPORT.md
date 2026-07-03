# Sprint 1 Regression Report — Groningen Cleaning MVP

> **Date:** 2026-07-01
> **Foundation version:** v2.2.1 (frozen)
> **Purpose:** Confirm that existing Utrecht functionality has not regressed after Sprint 1 implementation.

---

## Regression Test Results — Summary

| Area | Status | Notes |
|---|---|---|
| Build | ✅ PASS | `npm run build` exit 0, all routes compiled |
| Lint | ✅ PASS | 0 errors (1 pre-existing warning, unrelated) |
| Existing city gating | ✅ PASS | Groningen not public; existing cities unaffected |
| City helper functions | ✅ PASS | All 5 functions verified by logic review |
| i18n translation loading | ✅ PASS | Build compiled all NL + EN pages without error |
| Booking flow routes | ✅ PASS | Build compiled all booking routes without error |
| Existing CHECK constraints | ✅ PASS | Migration is additive; existing 4 cities preserved |
| Existing seed data | ✅ PASS | No existing rows modified |
| Provider application form | ✅ PASS | Dynamic; existing cities unaffected |
| Admin aanbieders | ✅ PASS | Dynamic; no change required |

---

## Detailed Checklist

### 1. Build and Lint

- [x] `npm run lint` — exit 0, **0 errors**.
  - 1 pre-existing warning in `app/[locale]/aanbod/[slug]/page.tsx` (`getTranslations` unused variable). This warning existed before Sprint 1 and is not introduced by these changes.
- [x] `npm run build` — exit 0. All routes compiled successfully including:
  - `/nl/voor-masseurs` and `/en/voor-masseurs` (pages referencing `cityEvaluationNote`)
  - `/nl/voor-masseurs/aanmelden` and `/en/voor-masseurs/aanmelden` (pages referencing `applyCityHelper`)
  - All Utrecht SEO landing pages (`/nl/massage-aan-huis-utrecht`, `/nl/sportmassage-utrecht`, etc.)
  - All booking routes (`/[locale]/aanbod/[slug]/boeken`)
  - All dashboard routes
  - All admin routes

---

### 2. City Gating — Existing Cities Unaffected

**Verified by code review of `lib/cities.ts` after modification:**

- [x] `getPublicCities()` — filters on `status === 'active' && publicVisible === true`. Groningen has `status: 'prelaunch'` and `publicVisible: false` → excluded. Utrecht/Amsterdam/Rotterdam/Den Haag configs are unchanged.
- [x] `getPublicCitySlugs()` — derives from `getPublicCities()`; Groningen absent. No existing city removed.
- [x] Groningen does not appear on `/aanbod`, sitemap, SEO landing pages, or any public-facing surface.

---

### 3. City Helper Functions — Logic Verification

| Function | Existing behaviour preserved? | Groningen handled correctly? |
|---|---|---|
| `getPublicCities()` | ✅ Yes — unchanged filter logic | ✅ Excluded (`publicVisible: false`) |
| `getPublicCitySlugs()` | ✅ Yes | ✅ Not in output |
| `getRecruitmentCities()` | ✅ Yes — Utrecht, Amsterdam, Rotterdam, Den Haag still returned | ✅ Now also returns Groningen |
| `getRecruitmentCitySlugs()` | ✅ Yes — existing 4 slugs still present | ✅ `'groningen'` now included |
| `isRecruitmentCitySlug('utrecht')` | ✅ Returns `true` | — |
| `isRecruitmentCitySlug('groningen')` | — | ✅ Returns `true` |
| `isRecruitmentCitySlug('invalid')` | ✅ Returns `false` | — |
| `getCityDisplayName('utrecht')` | ✅ Returns `'Utrecht'` | — |
| `getCityDisplayName('groningen')` | — | ✅ Returns `'Groningen'` |
| `getCityDisplayName('unknown')` | ✅ Falls back to raw slug | — |

---

### 4. Translation Loading — i18n Integrity

**Verified by successful build (all NL + EN static pages rendered):**

- [x] `messages/nl.json` — file structure intact. Only 2 string values modified, no keys renamed, no keys removed, no structural changes. JSON valid (confirmed by build).
- [x] `messages/en.json` — same. JSON valid (confirmed by build).
- [x] `forProviders.cityEvaluationNote` — updated in both NL and EN, content consistent.
- [x] `forProviders.applyCityHelper` — updated in both NL and EN, content consistent.
- [x] All other translation keys untouched — verified by diff scope (only 2 keys per file changed).

---

### 5. Booking Flow — Unaffected

- [x] Booking flow files (`app/[locale]/aanbod/[slug]/boeken/`, `app/api/stripe/webhook/`, `app/api/availability/`) — **zero files modified** in Sprint 1.
- [x] All booking routes compiled successfully in `npm run build`.
- [x] Groningen providers are not reachable through the public booking flow (`publicVisible: false` gates `lib/providers/public.ts`).

---

### 6. CHECK Constraints — Additive Only

**Migration design verified:**

- [x] Both `providers_city_slug_check` and `provider_applications_city_slug_check` are **dropped and re-created** — the drop removes the old 4-city constraint, the re-add creates a 5-city constraint.
- [x] All 4 existing city slugs (`'utrecht'`, `'amsterdam'`, `'rotterdam'`, `'den-haag'`) are preserved in the new constraint. No existing valid value is rejected.
- [x] No existing provider or provider_application rows are modified by this migration.
- [x] The migration is wrapped in `BEGIN / COMMIT` — atomic. If the constraint re-add fails, the drop is rolled back automatically.

---

### 7. Existing Seed Data — Unmodified

- [x] `service_categories` row for `slug = 'massage'` — not touched. `sort_order = 1` preserved.
- [x] All 6 massage `services` rows — not touched. No UPDATE or DELETE operations in migration 026.
- [x] Cleaning category and services are **inserted only**, with `gen_random_uuid()` IDs — no collision with existing rows.
- [x] `provider_services` table — not modified (no existing provider-service links exist in MVP).

---

### 8. Provider Application Form — Dynamic, Unbroken

- [x] `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` reads `getRecruitmentCities()` at runtime — no code change required, Groningen appears automatically.
- [x] `app/[locale]/voor-masseurs/aanmelden/actions.ts` validates via `isRecruitmentCitySlug()` — Groningen now passes validation correctly.
- [x] Existing city validation for Utrecht/Amsterdam/Rotterdam/Den Haag — unchanged.

---

### 9. Admin Aanbieders — Dynamic, Unbroken

- [x] `app/[locale]/admin/aanbieders/applications-list.tsx` uses `getCityDisplayName(app.city)` — renders `'Groningen'` automatically for new applications.
- [x] `app/[locale]/admin/aanbieders/actions.ts` uses `app.city` directly from DB — city-agnostic, no change required.
- [x] Existing application rendering for other cities — unchanged.

---

## Existing Functionality Affected

**None.** No existing functionality was changed unintentionally. All modifications are additive:
- The CHECK constraint change only adds `'groningen'` to the allowed set; existing values remain valid.
- The `CITIES` array addition only adds a new entry; existing entries are unchanged.
- The i18n string updates only extend city enumeration; no existing key was removed or renamed.

---

## Remaining Risks Entering Sprint 2

### Risk A — `dashboard/diensten` cross-contamination (Debt 1 from Audit)

**Status:** Accepted for Sprint 1, must be resolved in Sprint 2.

After this migration, the `getServicesData()` query in `dashboard/diensten/page.tsx` returns ALL active services (massage + cleaning). Any massage provider visiting their services dashboard will see cleaning services listed.

**Current impact:** None in production (no active providers, all cities `publicVisible: false`).
**Sprint 2 impact:** MUST be fixed before the first cleaning provider is onboarded. If not fixed, a cleaning provider could accidentally enable a massage service.

**Required fix:** Add `category_id` filter to `getServicesData()`, scoped to the provider's registered category.

---

### Risk B — Deployment order must be followed

**Status:** Documented in migration file header and implementation report.

The Supabase migration must be applied and verified in production **before** the Vercel code deployment is promoted. Failure to follow this order creates a CHECK constraint violation window for Groningen applications.

**Mitigation:** Add to PR description. Verify constraint contains `'groningen'` in Supabase dashboard before promoting Vercel deployment.

---

### Risk C — Service descriptions absent

**Status:** Acceptable. `description_nl` and `description_en` are nullable in the `services` table. No cleaning service descriptions were seeded in Sprint 1.

**Sprint 2 impact:** If a booking UI renders service descriptions, cleaning services will show empty/null. Must be addressed before cleaning services are exposed to customers.

---

### Risk D — `voor-masseurs/page.tsx` Utrecht/massage framing

**Status:** Accepted. Cleaning partners directed to `/voor-schoonmakers` in Sprint 3. The existing page is not broken — it simply targets massage providers only.

---

*Regression report complete. No regressions found. Sprint 1 is ready for deployment review.*
