# Sprint 3 Implementation Report — Partner Portal

> **Foundation version:** v2.2.1 (frozen)
> **Date completed:** 2026-07-02
> **Implementer:** Claude (sole implementation agent)
> **Sprint goal:** Enable cleaning partner discovery and application for Groningen.

---

## Summary

Sprint 3 is complete. **4 files were changed (1 new, 3 modified). 0 migrations. 0 RLS changes.**
The implementation is minimal and correct — all 3 tasks completed within approved scope.
The `/voor-schoonmakers` recruitment page is live at `/nl/voor-schoonmakers` and `/en/voor-schoonmakers`.

**Build status:** ✅ `npm run lint` — 0 errors, 1 pre-existing warning (non-Sprint-3 file). ✅ `npm run build` — exit 0, all routes compiled.

---

## Files Changed

### 1. `messages/nl.json` — MODIFIED

**Type:** Additive — 3 additions, no existing keys renamed or removed.

**Changes:**

| Addition | Location | Content |
|---|---|---|
| `forCleaners.*` namespace | Top-level (after `cleaning`) | 22 keys: meta, page copy, benefits, requirements, how-to, CTA |
| `booking.notesPlaceholderCleaning` | Inside `booking` namespace | NL cleaning notes placeholder text |
| `forProviders.applyLabelExperienceCleaning` | Inside `forProviders` namespace | Conditional experience label for cleaning applicants |

**Key spec added (`forCleaners`):**
```
metaTitle, metaDescription, pageTitle, pageSubtitle, cityEvaluationNote,
benefitsTitle, benefit1Title/Desc, benefit2Title/Desc, benefit3Title/Desc,
requirementsTitle, req1–req4,
howTitle, howStep1–howStep3,
ctaTitle, ctaBody, ctaApplyButton
```

---

### 2. `messages/en.json` — MODIFIED

**Type:** Additive — mirror of nl.json changes in English. 3 additions.

---

### 3. `app/[locale]/voor-schoonmakers/page.tsx` — **NEW FILE**

**Type:** New static page (SSG, `●` in build output).

**Route:** `/nl/voor-schoonmakers` and `/en/voor-schoonmakers`

**Structure:** 5 server-side sub-components, all using `useTranslations('forCleaners')`:

| Component | Content |
|---|---|
| `PageHeader` | Title, subtitle, Groningen launch note |
| `BenefitsSection` | 3 benefit cards (Flexible schedule, Direct payment, No acquisition) |
| `RequirementsSection` | 4 requirements checklist |
| `HowToApplySection` | 3-step numbered process |
| `CtaSection` | Dark CTA block → links to `/voor-masseurs/aanmelden` |

**Pattern:** Exactly follows `voor-masseurs/page.tsx` structure.
**Auth:** Public — no guard required.
**Mutations:** None.

---

### 4. `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` — MODIFIED

**Type:** Additive client-side state — no form logic, no schema, no RLS change.

**Changes:**

1. **Added `selectedCity` state** — `useState('utrecht')`, tracks current city select value.
2. **Added `selectedServiceTypes` state** — `useState('')`, tracks current service_types input value.
3. **Derived `isCleaningApplicant`** — true when `selectedCity === 'groningen'` AND `selectedServiceTypes.toLowerCase().includes('cleaning')`.
4. **City select**: changed from `defaultValue="utrecht"` to controlled `value={selectedCity}` + `onChange={(e) => setSelectedCity(e.target.value)}`.
5. **Service types input**: added `onChange={(e) => setSelectedServiceTypes(e.target.value)}`.
6. **Experience label**: conditionally renders `applyLabelExperienceCleaning` when `isCleaningApplicant`, otherwise the original `applyLabelExperience`.

**Form submission:** Unchanged. All existing fields (`full_name`, `email`, `phone`, `city`,
`service_types`, `service_mode`, `service_area`, `experience_years`, `instagram_or_website`,
`message`) are submitted via `FormData` to `submitProviderApplicationAction` — no new fields,
no removed fields.

**Invariant check:**
- `submitProviderApplicationAction` and the RLS policy on `provider_applications` are untouched ✅
- `getRecruitmentCities()` call unchanged ✅
- Honeypot field unchanged ✅
- Success/error state handling unchanged ✅

---

## Files Verified as NOT Modified

| File | Verification |
|---|---|
| `supabase/migrations/*` | 0 new migration files. Last migration: `202607010001`. ✅ |
| `proxy.ts` | Not touched. ✅ |
| `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx` | Not touched. ✅ |
| `app/[locale]/aanbod/[slug]/boeken/actions.ts` | Not touched. ✅ |
| `app/api/stripe/webhook/route.ts` | Not touched. ✅ |
| `lib/cities.ts` | Not touched. ✅ |
| `lib/types/database.ts` | Not touched. ✅ |
| All `dashboard/*` pages | Not touched. ✅ |
| All `admin/*` pages | Not touched. ✅ |

---

## Build Verification

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors — 1 pre-existing warning in non-Sprint-3 file (`aanbod/[slug]/page.tsx`) |
| `npm run build` | ✅ exit 0 — all routes compiled |
| `/nl/voor-schoonmakers` | ✅ Compiled as SSG (`●`) |
| `/en/voor-schoonmakers` | ✅ Compiled as SSG (`●`) |
| `/nl/voor-masseurs/aanmelden` | ✅ Compiled as SSG (`●`) — no regression |
| `/en/voor-masseurs/aanmelden` | ✅ Compiled as SSG (`●`) — no regression |

---

## Sprint 3 Exit Criteria

| Criterion | Status |
|---|---|
| `forCleaners.*` namespace present in both `nl.json` and `en.json` | ✅ Complete |
| `booking.notesPlaceholderCleaning` key added to both message files | ✅ Complete |
| `forProviders.applyLabelExperienceCleaning` key added to both message files | ✅ Complete |
| `/voor-schoonmakers/page.tsx` renders without errors | ✅ Build confirmed |
| Page CTA links to `/voor-masseurs/aanmelden` | ✅ Confirmed in source |
| Application form shows cleaning-adapted label when city=groningen + service includes cleaning | ✅ Complete |
| `npm run lint && npm run build` pass with zero errors | ✅ Confirmed |

---

## Technical Debt Status (Post Sprint 3)

| Debt | Status |
|---|---|
| `booking.notesPlaceholderCleaning` key missing (S2 carry-over) | ✅ **Resolved** in S3-B |
| `lib/types/marketplace.ts` stale comment | Still deferred — low priority |
| Cleaning service descriptions not seeded | Still deferred — nullable, non-blocking |
| PropertyTypeSelector (S2-C deferred) | Still deferred — Sprint 4 scope |
| Conditional placeholder logic in booking-flow.tsx (`notesPlaceholderCleaning` usage) | Still deferred — Sprint 4 scope |

---

## Known Limitation

**`/voor-masseurs/aanmelden` URL for cleaning partner applications:**
A cleaning partner clicking the CTA on `/voor-schoonmakers` lands at `/voor-masseurs/aanmelden`.
The URL contains "masseurs" which is massage-specific branding. This is a cosmetic debt accepted
at MVP scale (< 10 cleaning partners). The form content is generic and functions correctly.
Resolve in Sprint 7 with a clean `/aanmelden/` route.

---

## Sprint 3 Change Summary

```
FILES CREATED:    1  (app/[locale]/voor-schoonmakers/page.tsx)
FILES MODIFIED:   3  (messages/nl.json, messages/en.json,
                       voor-masseurs/aanmelden/application-form.tsx)
FILES DELETED:    0
MIGRATIONS:       0
RLS CHANGES:      0
BOOKING CHANGES:  0
PAYMENT CHANGES:  0
AUTH CHANGES:     0
```

---

## TOUCHES RLS / PAYMENT / AUTH: No

---

## What Remains Before First Groningen Booking

Sprint 3 completes the partner recruitment funnel. The remaining critical path is:

```
Sprint 4 (Booking Flow) ── parallel with Sprint 3, now unblocked ──► Sprint 5 (Payments)
      │                                                                       │
      └─── exit criterion: customer can complete cleaning booking ────────────┘
                                                                              │
Sprint 5 exit criterion: Stripe test payment succeeds for cleaning booking ───┘
                                                                              │
Sprint 8 (Launch Prep): flip groningen publicVisible=true ────────────────────┘
                                                                              │
Sprint 9 (Production Validation): first real paid booking ────────────────────┘
```

**Next suggested step:** Sprint 4 — Booking Flow (independent of Sprint 3, can start immediately).
Requires reading `docs/STABLE_MODULES.md` before any Subsystem A file is touched.
