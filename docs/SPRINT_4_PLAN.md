# Sprint 4 Plan — Cleaning-Specific Address Notes in Booking Flow

**Status:** Planning only — no production files modified
**Prepared:** 2026-07-02
**Type:** Bug fix / UX copy patch (Subsystem A + C — booking flow + i18n)
**Risk level:** 🟡 MEDIUM — touches booking-flow.tsx (Subsystem A); read STABLE_MODULES.md before implementing

---

## Goal

When a customer books a cleaning service, the notes textarea in the address step should:
- Display a label that says "Notities voor de schoonmaker" instead of "Notities voor de therapeut"
- Display a cleaning-specific placeholder (`booking.notesPlaceholderCleaning`) instead of the massage-specific one

Both i18n keys for the placeholder already exist. The label key and the wiring do not.

---

## Current State — What Exists

### Where `address_notes` is collected

`AddressStep` component in `booking-flow.tsx` (lines 341–401):

```
<label>{t('notesLabel')}</label>
<textarea placeholder={t('notesPlaceholder')} …/>
```

- `t('notesLabel')` = "Notities voor de therapeut (optioneel)" — always massage-specific
- `t('notesPlaceholder')` = "Bijv. bellcode, etage, voorkeur voor druk..." — massage-specific

### Where `address_notes` is stored

`actions.ts` line 54 + 183:

```typescript
const addressNotes = (formData.get('address_notes') as string | null) || null;
// … inserted into bookings.address_notes
```

The server action stores the value verbatim. **No changes needed here.**

### i18n keys — current inventory (`booking` namespace)

| Key | NL value | EN value | Exists? |
|-----|----------|----------|---------|
| `notesLabel` | "Notities voor de therapeut (optioneel)" | "Notes for the therapist (optional)" | ✅ |
| `notesPlaceholder` | "Bijv. bellcode, etage, voorkeur voor druk..." | "E.g. door code, floor, pressure preference..." | ✅ |
| `notesPlaceholderCleaning` | "Bijv. appartement of woonhuis, bellcode, verdieping, bijzonderheden voor de schoonmaker." | "E.g. apartment or house, door code, floor, any notes for the cleaner." | ✅ |
| `notesLabelCleaning` | — | — | ❌ MISSING |

### Service type detection

The booking flow has **no `service_categories` field** — the `services` table exposes only:
`id`, `name_nl`, `name_en`, `duration_minutes`, `base_price_cents`.

There is no `category_id`, `is_cleaning`, or similar discriminator in the current schema or DB query.

---

## Decision — How to Detect Cleaning Service

Three options were evaluated:

| Option | Approach | Schema change? | Fragility |
|--------|----------|----------------|-----------|
| A | Keyword match on `service.name_nl` / `name_en` | No | Medium — depends on name conventions |
| B | City-based detection (e.g. Groningen = cleaning) | No | High — cleaning can be in any city |
| C | Add `is_cleaning` boolean to `services` table | Yes — new migration | Low |

**Recommendation: Option A (keyword match)**

Rationale:
- Consistent with the approach already used in `application-form.tsx` (Sprint 3.6)
- No DB migration required → stays within Sprint 4 scope
- The keyword list is a shared constant that can be extracted to `lib/cleaning.ts`
- If the service names are renamed in the future, a simple update to the constants file fixes it

---

## Proposed Changes — Minimal File List

### File 1 — `lib/cleaning.ts` *(new — 5 lines)*

Extract the cleaning keyword list into a shared constant so both the application form and the booking flow use the same truth.

```typescript
export const CLEANING_TERMS = [
  'schoonmaak',
  'huishoudelijke hulp',
  'interieurverzorging',
  'cleaning',
] as const;

export function isCleaningService(nameNl: string, nameEn: string): boolean {
  const combined = `${nameNl} ${nameEn}`.toLowerCase();
  return CLEANING_TERMS.some((term) => combined.includes(term));
}
```

### File 2 — `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` *(minor refactor)*

Replace the inline `CLEANING_TERMS` array with the shared `isCleaningService` helper from `lib/cleaning.ts`.
This is a pure refactor — no behaviour change.

### File 3 — `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx` *(targeted edit)*

**Change A — `AddressStep` props interface** (add one prop):

```typescript
// Add to the props destructure:
isCleaningService: boolean;
```

**Change B — `AddressStep` render** (switch label + placeholder):

```tsx
// Before:
<label>{t('notesLabel')}</label>
<textarea placeholder={t('notesPlaceholder')} …/>

// After:
<label>
  {isCleaningService ? t('notesLabelCleaning') : t('notesLabel')}
</label>
<textarea
  placeholder={isCleaningService ? t('notesPlaceholderCleaning') : t('notesPlaceholder')}
  …
/>
```

**Change C — Main orchestrator** (derive `isCleaningService` from selected service, pass prop):

```tsx
// Derive once at orchestrator level, after service is selected:
const isCleaningSvc = service
  ? isCleaningService(
      service.services!.name_nl,
      service.services!.name_en,
    )
  : false;

// Pass to both AddressStep call sites:
// 1. mobile_only path (step === 3 && !isStudioOnly && !isHybrid)
// 2. hybrid+at_home path (isHybrid && step === 4 && appointmentType === 'at_home')
<AddressStep … isCleaningService={isCleaningSvc} />
```

> ⚠️ `AddressStep` is rendered in **two places** in the JSX. Both must receive the prop.

### File 4 — `messages/nl.json` *(1 new key)*

```json
"notesLabelCleaning": "Notities voor de schoonmaker (optioneel)"
```

### File 5 — `messages/en.json` *(1 new key)*

```json
"notesLabelCleaning": "Notes for the cleaner (optional)"
```

---

## Files NOT Touched

| File | Reason |
|------|--------|
| `actions.ts` | `address_notes` is already stored correctly — no change needed |
| `supabase/migrations/` | No schema change required |
| `proxy.ts` | Auth unchanged |
| `app/api/stripe/webhook/route.ts` | Payment unchanged |
| Any other booking step component | Only `AddressStep` shows notes |

---

## Risks

### Risk 1 — Subsystem A (Booking) is HIGH RISK 🔴
**Mitigation:** Read `docs/STABLE_MODULES.md` before touching `booking-flow.tsx`. The changes are purely UI/copy — no financial logic, no FormData field names, no server action changes.

### Risk 2 — Two `AddressStep` call sites
**Mitigation:** Both the `mobile_only` (step 3) and `hybrid+at_home` (step 4) paths render `AddressStep`. If only one is updated, hybrid cleaning providers will show the wrong label.
**Action:** Explicitly verify both JSX blocks during implementation.

### Risk 3 — Keyword-match fragility
**Mitigation:** Centralise keywords in `lib/cleaning.ts`. Document that service names for cleaning providers must contain at least one of the listed terms.

### Risk 4 — TypeScript prop propagation
**Mitigation:** Adding a required `isCleaningService: boolean` prop will cause a TypeScript compile error if either call site is missed — the compiler acts as a safety net. Run `npm run build` to confirm.

---

## Test Plan

| Scenario | Expected result |
|----------|----------------|
| Massage provider — address step | Label: "Notities voor de therapeut (optioneel)" |
| Massage provider — address step | Placeholder: "Bijv. bellcode, etage, voorkeur voor druk..." |
| Provider with service name containing "schoonmaak" — address step | Label: "Notities voor de schoonmaker (optioneel)" |
| Provider with service name containing "huishoudelijke hulp" — address step | Label: "Notities voor de schoonmaker (optioneel)" |
| Provider with service name containing "interieurverzorging" — address step | Label: "Notities voor de schoonmaker (optioneel)" |
| Provider with service name containing "cleaning" (EN) — address step | Label: "Notities voor de schoonmaker (optioneel)" |
| Cleaning provider via hybrid+at_home path (step 4 AddressStep) | Label: "Notities voor de schoonmaker (optioneel)" |
| Cleaning provider via hybrid+in_studio path | AddressStep not shown — no regression |
| `address_notes` value submitted | Stored in `bookings.address_notes` unchanged (actions.ts not modified) |
| `npm run lint` | 0 errors |
| `npm run build` | ✅ success |

---

## Implementation Sequence (when approved)

1. Create `lib/cleaning.ts` with shared helper
2. Refactor `application-form.tsx` to use shared helper (pure rename, no behaviour change)
3. Edit `booking-flow.tsx`:
   a. Add `isCleaningService` prop to `AddressStep`
   b. Update both `AddressStep` render call sites
   c. Derive `isCleaningSvc` in the main orchestrator
4. Add `notesLabelCleaning` to `messages/nl.json` and `messages/en.json`
5. Run `npm run lint` → 0 errors
6. Run `npm run build` → success
7. Write `docs/SPRINT_4_COMPLETION_REPORT.md`

**Do not start implementation until this plan is approved.**
