# Sprint 4.5 — Read-only Drift Audit: Cleaning Detection Logic

**Date:** 2026-07-02
**Type:** Read-only audit — no files modified
**Scope:** All runtime definitions of cleaning keyword lists across the codebase

---

## 1. All Places That Define Cleaning Keywords

Two source files contain a `CLEANING_TERMS` definition. One migration file is also relevant.

---

### Definition A — `application-form.tsx` (Sprint 3.6)

**File:** `app/[locale]/voor-masseurs/aanmelden/application-form.tsx`
**Lines:** 18–23
**Scope:** Component-scoped (inside `ApplicationForm` function body — re-created on every render)
**Input it inspects:** Free-text typed by a provider applicant into the `service_types` field

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

---

### Definition B — `booking-flow.tsx` (Sprint 4)

**File:** `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx`
**Line:** 14
**Scope:** Module-scoped (top-level constant — created once at module load)
**Input it inspects:** Database-sourced `services.name_nl` + `services.name_en`, concatenated

```typescript
const CLEANING_TERMS = ['schoonmaak', 'huishoudelijke hulp', 'interieurverzorging', 'cleaning'];

// Used at line 543 in the orchestrator:
const isCleaningSvc = service
  ? CLEANING_TERMS.some((term) =>
      `${service.services!.name_nl} ${service.services!.name_en}`
        .toLowerCase()
        .includes(term),
    )
  : false;
```

---

### Relevant migration — `202607010001_add_groningen_cleaning.sql` (Sprint Groningen)

**File:** `supabase/migrations/202607010001_add_groningen_cleaning.sql`
**Role:** Defines the authoritative set of cleaning services in the database

The migration inserts 5 services under `service_categories.slug = 'cleaning'`:

| `name_nl` | `name_en` |
|-----------|-----------|
| Schoonmaak 2 uur | Cleaning 2 hours |
| Schoonmaak 3 uur | Cleaning 3 hours |
| Schoonmaak 4 uur | Cleaning 4 hours |
| Dieptereiniging | Deep clean |
| Einde huur schoonmaak | End of tenancy clean |

---

## 2. Do the Two Definitions Match Exactly?

**Array contents: ✅ Identical**

Both definitions contain exactly the same 4 strings, in the same order:

```
'schoonmaak'  |  'huishoudelijke hulp'  |  'interieurverzorging'  |  'cleaning'
```

No spelling differences, no casing differences, no extra or missing terms.

**Format: ⚠️ Minor structural difference**

| | `application-form.tsx` | `booking-flow.tsx` |
|--|--|--|
| Declaration style | Multi-line array literal | Single-line array literal |
| Variable scope | Component-scoped (`const` inside function body) | Module-scoped (`const` at file top) |
| Effect | Re-allocated on every render | Allocated once at module load |

The multi-line vs single-line difference is cosmetic and has no runtime effect. The scope difference is appropriate: the application form needs the array inside the component to access `selectedServiceTypes` via closure; the booking flow correctly hoists it to module scope since it does not close over any component state.

---

## 3. Coverage Analysis — DB Services vs. Keyword List

This is the most significant finding of this audit.

### Matching matrix

| DB `name_nl` | DB `name_en` | Matched by `schoonmaak` | Matched by `cleaning` | Overall |
|---|---|---|---|---|
| Schoonmaak 2 uur | Cleaning 2 hours | ✅ | ✅ | ✅ detected |
| Schoonmaak 3 uur | Cleaning 3 hours | ✅ | ✅ | ✅ detected |
| Schoonmaak 4 uur | Cleaning 4 hours | ✅ | ✅ | ✅ detected |
| Einde huur schoonmaak | End of tenancy clean | ✅ | ❌* | ✅ detected (via NL) |
| **Dieptereiniging** | **Deep clean** | ❌ | ❌ | **🔴 NOT detected** |

*`'End of tenancy clean'.includes('cleaning')` → `false` because the term is `'clean'` not `'cleaning'`; this row is saved by the Dutch name containing `'schoonmaak'`.

### Critical gap: `Dieptereiniging / Deep clean`

A customer booking **Dieptereiniging** (Deep clean) will reach `AddressStep` and see:
- **Label:** "Notities voor de therapeut (optioneel)" — massage-specific, wrong
- **Placeholder:** "Bijv. bellcode, etage, voorkeur voor druk..." — massage-specific, wrong

Neither name contains any of the 4 keyword terms. This is a live UX bug for any
cleaning provider who offers this service in the pilot.

### Why the DB category is not used

The authoritative discriminator already exists: `service_categories.slug = 'cleaning'`
and `services.category_id`. However, `fetchProviderForBooking` in
`lib/providers/public.ts` (line 91–107) **does not select `category_id`** from the
`services` join. The booking flow has no access to this field and cannot use it.

---

## 4. Whether a Shared Helper Is Justified Now or Should Wait

### Current situation

The two keyword arrays are identical today, but they are maintained independently.
A future content change to one (e.g. adding `'glazenwassen'`) without updating the
other would cause silent behavioral divergence between the application form and the
booking flow — two different systems would classify the same service differently.

### Shared helper: assessment

| Option | Effort | Risk removed | Remaining gap |
|--------|--------|--------------|---------------|
| Extract `CLEANING_TERMS` to `lib/cleaning.ts` | ~15 min, 3 files | Eliminates drift between the 2 keyword arrays | Does not fix Dieptereiniging |
| Add `category_id` to `fetchProviderForBooking` query + use it in `booking-flow.tsx` | ~45 min, 2 files (lib/providers/public.ts + booking-flow.tsx) | Eliminates keyword matching entirely for the booking flow | Application form still needs keywords (free-text) |
| Both | ~1 h | Eliminates drift + coverage gap | None |

### Recommendation

**Do not extract a shared helper yet — fix the coverage gap first.**

Reasoning:
1. A shared constant that omits `'Dieptereiniging'` propagates the same bug to both files.
2. The correct fix for the booking flow is `category_id`-based detection — this makes
   the keyword list irrelevant for that path. Extracting a shared constant now, only to
   delete half of it next sprint, adds churn without durable value.
3. The application form is free-text input — keyword matching is unavoidable there.
   It can keep its own inline list with no risk since it doesn't interact with DB names.

**Recommended sequence for the next sprint:**
1. Add `category_id` to the `services` sub-select in `fetchProviderForBooking`.
2. Propagate `category_id` through the `Service` type in `booking-flow.tsx`.
3. Replace `CLEANING_TERMS.some(…)` in the orchestrator with
   `service.services!.category_slug === 'cleaning'` (or equivalent).
4. Remove `CLEANING_TERMS` from `booking-flow.tsx` — no longer needed there.
5. Keep `CLEANING_TERMS` in `application-form.tsx` (free-text, keyword matching is the only option).

This eliminates the `Dieptereiniging` gap and the drift risk in a single sprint.

---

## 5. Risks Before Pilot Launch

| # | Risk | Severity | Affected service | Mitigation |
|---|------|----------|-----------------|------------|
| 1 | `Dieptereiniging / Deep clean` shows massage copy in booking address step | 🔴 HIGH | All customers booking deep clean | Fix `fetchProviderForBooking` to expose `category_id`; use it in `booking-flow.tsx` |
| 2 | Keyword array drift (two independent copies) | 🟡 MEDIUM | Any future service added with non-keyword names | Extract shared constant OR switch booking flow to category_id detection |
| 3 | New cleaning service names added to DB without keywords | 🟡 MEDIUM | Any such future service | Same fix as risk 1 — category_id is immune to name changes |
| 4 | `'End of tenancy clean'` only caught via Dutch name | 🟢 LOW | Edge case if the combined NL+EN check is ever split | No action needed now; NL name contains `schoonmaak` |

**Summary:** Risk 1 (`Dieptereiniging`) is the only risk that is live today and affects
a specific, named DB service. It should be fixed before the Groningen pilot opens bookings.
Risks 2–3 are latent and become relevant only when new services are added.

---

## Conclusion

| Question | Answer |
|----------|--------|
| All places that define cleaning keywords | 2 runtime definitions (application-form.tsx, booking-flow.tsx) |
| Do they match exactly? | ✅ Array contents identical; ⚠️ scope differs (component vs module) |
| Shared helper justified now? | ❌ No — fix `category_id` gap first; then shared constant becomes unnecessary for the booking flow |
| Risk before pilot launch? | 🔴 Yes — `Dieptereiniging / Deep clean` will show massage copy; must be fixed before Groningen pilot opens |
