# Sprint 3.6 Completion Report — Cleaning Application Form Fix

**Date:** 2026-07-02
**Sprint type:** Bug fix (not Sprint 4)
**Risk level:** 🟢 LOW — UI + i18n only; no RLS / Auth / Payment / DB schema touched

---

## Objective

Fix the provider application form (`/voor-masseurs/aanmelden`) so that applicants who indicate they offer cleaning services see correct labels and helper text instead of massage-specific copy.

---

## Root Cause Analysis

### Bug 1 — `isCleaningApplicant` logic was too narrow

**Before:**
```typescript
const isCleaningApplicant =
  selectedCity === 'groningen' &&
  selectedServiceTypes.toLowerCase().includes('cleaning');
```

Two flaws:
1. **City gating was wrong.** Cleaning applicants can come from any city — restricting to Groningen was a leftover from an earlier draft.
2. **Only English term `'cleaning'` was checked.** Dutch applicants typing "schoonmaak", "huishoudelijke hulp", or "interieurverzorging" were not recognized.

**After:**
```typescript
const CLEANING_TERMS = [
  'schoonmaak',
  'huishoudelijke hulp',
  'interieurverzorging',
  'cleaning',
];
const isCleaningApplicant = CLEANING_TERMS.some((term) =>
  selectedServiceTypes.toLowerCase().includes(term),
);
```

### Bug 2 — `service_types` label always showed massage copy

The `service_types` field always rendered `t('applyLabelServices')` = "Welke massages bied je aan?" even when `isCleaningApplicant` was true. Cleaning applicants saw an irrelevant massage question.

### Bug 3 — Missing i18n keys

The conditional branches introduced by the fix required three new translation keys per locale that did not exist:
- `applyLabelServicesCleaning`
- `applyLabelServicesCleaningPh`
- `applyLabelServiceModeCleaning`

---

## Files Changed

| File | Change |
|------|--------|
| `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` | Fixed `isCleaningApplicant`; added conditional labels for `service_types` and `service_mode` |
| `messages/nl.json` | Added 3 new keys under `forProviders` namespace |
| `messages/en.json` | Added 3 new keys under `forProviders` namespace |

---

## New i18n Keys

### `messages/nl.json`

```json
"applyLabelServicesCleaning": "Welke schoonmaakdiensten bied je aan?",
"applyLabelServicesCleaningPh": "Bijv. reguliere huishoudelijke hulp, dieptereinigen, kantoorschoonmaak…",
"applyLabelServiceModeCleaning": "Waar bied je schoonmaakdiensten aan?"
```

### `messages/en.json`

```json
"applyLabelServicesCleaning": "What cleaning services do you offer?",
"applyLabelServicesCleaningPh": "E.g. regular household cleaning, deep cleaning, office cleaning…",
"applyLabelServiceModeCleaning": "Where do you offer cleaning services?"
```

---

## Behaviour After Fix

| Input typed in `service_types` | `isCleaningApplicant` | Label shown |
|---|---|---|
| `schoonmaak` | `true` | Welke schoonmaakdiensten bied je aan? |
| `huishoudelijke hulp` | `true` | Welke schoonmaakdiensten bied je aan? |
| `interieurverzorging` | `true` | Welke schoonmaakdiensten bied je aan? |
| `cleaning` | `true` | Welke schoonmaakdiensten bied je aan? |
| `Zweedse massage` | `false` | Welke massages bied je aan? |
| *(empty)* | `false` | Welke massages bied je aan? |

City selection no longer affects which label is shown.

---

## Scope Confirmation

| Area | Touched? |
|------|----------|
| RLS policies | ❌ No |
| Auth / middleware | ❌ No |
| Stripe / payments | ❌ No |
| DB schema / migrations | ❌ No |
| Booking flow | ❌ No |
| Admin dashboard | ❌ No |
| Provider dashboard | ❌ No |

---

## Build Status

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ 0 errors (1 pre-existing unrelated warning) |
| `npm run build` | ✅ Success — all pages compiled including `/[locale]/voor-masseurs/aanmelden` |

---

## What Was NOT Built

- No new routes
- No DB migration
- No new form fields
- No changes to submission logic or server action

---

## Next Suggested Step

Sprint 3.6 is complete. The cleaning applicant path is fully functional. The next task should be Sprint 4 planning.
