# Sprint 4 Completion Report — Cleaning-Specific Booking Notes

**Date:** 2026-07-02
**Sprint type:** Bug fix / UX copy patch
**Risk level:** 🟢 LOW — UI + i18n only; no RLS / Auth / Payment / DB schema touched

---

## Objective

When a customer books a cleaning service, the notes textarea in the address step
(`AddressStep`) must display cleaning-specific label and placeholder text instead
of massage-specific copy.

---

## Root Cause

`booking.notesPlaceholderCleaning` already existed in both locale files but was
never wired into `AddressStep`. The `AddressStep` component had no mechanism to
know whether the selected service was a cleaning service, so it always rendered
massage-specific copy (`notesLabel` / `notesPlaceholder`).

Additionally, the label key `booking.notesLabelCleaning` was entirely missing.

---

## Files Changed

| File | Change |
|------|--------|
| `messages/nl.json` | Added `notesLabelCleaning`: "Notities voor de schoonmaker (optioneel)" |
| `messages/en.json` | Added `notesLabelCleaning`: "Notes for the cleaner (optional)" |
| `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx` | See detail below |

### `booking-flow.tsx` — three targeted changes

**1. Module-level constant** (after `TZ_OFFSET_H`):

```typescript
const CLEANING_TERMS = ['schoonmaak', 'huishoudelijke hulp', 'interieurverzorging', 'cleaning'];
```

Follows the same inline pattern used in `application-form.tsx` (Sprint 3.6).
No new file or abstraction layer introduced.

**2. `AddressStep` component** — new `isCleaningService: boolean` prop, conditional render:

```tsx
// Label:
{isCleaningService ? t('notesLabelCleaning') : t('notesLabel')}

// Placeholder:
placeholder={isCleaningService ? t('notesPlaceholderCleaning') : t('notesPlaceholder')}
```

**3. Main orchestrator** — derive `isCleaningSvc` once after service is selected,
pass it to both `AddressStep` render paths:

```typescript
const isCleaningSvc = service
  ? CLEANING_TERMS.some((term) =>
      `${service.services!.name_nl} ${service.services!.name_en}`
        .toLowerCase()
        .includes(term),
    )
  : false;
```

Both call sites updated:
- `mobile_only` path (step 3): `<AddressStep … isCleaningService={isCleaningSvc} />`
- `hybrid+at_home` path (step 4): `<AddressStep … isCleaningService={isCleaningSvc} />`

---

## Behaviour After Fix

| Service name contains | `isCleaningSvc` | Notes label shown |
|---|---|---|
| "schoonmaak" | `true` | Notities voor de schoonmaker (optioneel) |
| "huishoudelijke hulp" | `true` | Notities voor de schoonmaker (optioneel) |
| "interieurverzorging" | `true` | Notities voor de schoonmaker (optioneel) |
| "cleaning" | `true` | Notities voor de schoonmaker (optioneel) |
| "Zweedse massage" | `false` | Notities voor de therapeut (optioneel) |
| *(nothing selected yet)* | `false` | Notities voor de therapeut (optioneel) |

---

## Scope Confirmation

| Area | Touched? |
|------|----------|
| RLS policies | ❌ No |
| Auth / middleware | ❌ No |
| Stripe / payments | ❌ No |
| DB schema / migrations | ❌ No |
| `actions.ts` (booking server action) | ❌ No |
| `address_notes` FormData field name | ❌ No — unchanged |
| Admin dashboard | ❌ No |
| Provider dashboard | ❌ No |

---

## Build Status

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ 0 errors (1 pre-existing unrelated warning in `aanbod/[slug]/page.tsx`) |
| `npm run build` | ✅ Success — all pages compiled |

---

## What Was NOT Built

- No new shared utility file (`lib/cleaning.ts`) — per instruction 4, no new abstractions
- No DB migration
- No new form fields or API changes
- No changes to submission logic, FormData keys, or Stripe session

---

## Plan Deviation Log

| Plan item | Actual | Reason |
|-----------|--------|--------|
| Create `lib/cleaning.ts` shared helper | Not created | Sprint 4 instruction 4: "Do not create new abstractions unless required by existing project patterns." Inline constant follows the `application-form.tsx` precedent. |

---

## Next Suggested Step

Sprint 4 complete. Both cleaning applicant flows (application form + booking notes)
now surface correct Dutch copy. The next sprint can address a remaining gap:
the `hybrid+in_studio` path for cleaning providers (studio info step) still shows
massage-specific copy in `StudioInfoStep` — if cleaning providers ever offer studio
mode, this should be addressed then.
