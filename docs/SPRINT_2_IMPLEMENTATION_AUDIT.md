# Sprint 2 Implementation Audit — Cleaning Category

> **Audit type:** Read-only pre-implementation analysis.
> No code was modified. No migrations were written. No SQL was executed.
>
> **Audit scope:** Every file Sprint 2 will require touching.
> **Stop condition:** Audit complete. Awaiting task selection.
>
> **Auditor:** CTO / Lead Engineer
> **Date:** 2026-07-01
> **Foundation version:** v2.2.1 (frozen, Sprint 1 applied)

---

## Executive Summary

Sprint 2 is **correctly scoped** and technically straightforward. The three workstreams
(i18n copy, dashboard category filter, booking flow property selector) are independent of
each other and can be done sequentially with no cross-subsystem interference within
each sub-task.

**One hard blocker was carried from Sprint 1:** the `dashboard/diensten` services list
must be filtered by provider category before any cleaning partner is onboarded (Sprint 3).
This blocker is resolved by Sprint 2-B below — no migration required.

**The availability API needs no changes.** It is already fully duration-agnostic
and correctly handles 3–5h cleaning slots.

**Total files requiring change: 6 (plus 1 new component).**

---

## Sprint 2 Dependency on Sprint 1

| Sprint 1 Deliverable | Sprint 2 Dependency |
|---|---|
| `service_categories` row: `cleaning` (migration 026) | Sprint 2-B uses `category_id` FK to filter services |
| 5 cleaning `services` rows (migration 026) | Sprint 2-A adds NL/EN copy matching those 5 names |
| `lib/cities.ts`: groningen entry | Sprint 2-C address step can pre-fill "Groningen" correctly |
| Build passing: `npm run lint && npm run build` ✅ | Sprint 2 tasks inherit a clean build baseline |

All Sprint 1 deliverables are confirmed complete (`docs/SPRINT_1_IMPLEMENTATION_REPORT.md`).

---

## Repository Analysis — Sprint 2 Impact Assessment

| Module | Files in Scope | Affected by Sprint 2 | Risk |
|---|---|---|---|
| i18n copy | messages/nl.json, messages/en.json | 2 (new cleaning.* keys) | Low |
| Provider dashboard diensten | page.tsx | 1 (category filter fix) | Low |
| Booking flow orchestrator | booking-flow.tsx | 1 (property type state + selector) | High |
| Booking flow page | boeken/page.tsx | 0 — no change needed | None |
| Provider data layer | lib/providers/public.ts | 1 (add category_slug to select) | Low |
| Booking server action | boeken/actions.ts | 1 (add customer_notes to insert) | Medium |
| New component | components/booking/property-type-selector.tsx | 1 new | Low |
| Availability API | app/api/availability/route.ts | 0 — already duration-agnostic ✅ | None |
| All security/RLS/migration files | supabase/migrations/* | 0 — no schema change | None |
| Stripe webhook | app/api/stripe/webhook/route.ts | 0 | None |
| Auth / middleware | proxy.ts | 0 | None |

---

## Sprint 2 Sub-Task Decomposition

### S2-A — i18n Cleaning Copy (Subsystem C)

**Objective:** Add `cleaning.*` namespace to both message files.

**Why it's needed:**
Sprint 2-C (property type selector) renders property type labels via `useTranslations`.
Without the i18n keys, the component will throw at render time. S2-A must be completed
before S2-C can build.

The 5 cleaning service names already exist in the database (NL + EN) from Sprint 1.
Sprint 2 adds the UI-layer i18n keys that the booking flow and dashboard will reference.

**Files:**
- `messages/nl.json` — add `cleaning` top-level namespace (see key spec below)
- `messages/en.json` — add English equivalents

**Key spec — `cleaning.*` namespace:**

```json
"cleaning": {
  "propertyTypeLabel": "Type woning",
  "propertyTypePlaceholder": "Selecteer type woning",
  "propertyTypeApartment": "Appartement",
  "propertyTypeHouse": "Woonhuis",
  "propertyTypeStudio": "Studio",
  "propertyTypeOffice": "Kantoor",
  "bookingNote": "De schoonmaker brengt eigen schoonmaakmiddelen mee.",
  "services": {
    "schoonmaak2uur": "Schoonmaak 2 uur",
    "schoonmaak3uur": "Schoonmaak 3 uur",
    "schoonmaak4uur": "Schoonmaak 4 uur",
    "dieptereiniging": "Dieptereiniging",
    "eindeHuur": "Einde huur schoonmaak"
  }
}
```

**Estimated complexity:** Low
**Estimated risk:** Low — copy only; worst case is a typo
**Architecture impact:** None
**Subsystem:** C (i18n / Copy)
**Build check required:** No (copy-only, per AI_WORKFLOW.md)

---

### S2-B — Dashboard Services Category Filter (Subsystem D)

**Objective:** Fix `getServicesData()` so a provider only sees services from their own
service category. Resolves Sprint 1 Debt 1 (HARD BLOCKER before Sprint 3 onboarding).

**Why it's a hard blocker:**
The current query:
```typescript
supabase.from('services').select('id, name_nl, name_en, base_price_cents, duration_minutes')
         .eq('is_active', true)
```
This fetches ALL 5 massage services + ALL 5 cleaning services in a single list.
Any provider who visits `/dashboard/diensten` after Sprint 1 deployed sees both categories
mixed together and could accidentally enable the wrong category's services.

Sprint 3 will onboard real cleaning partners. If this is not fixed first, a cleaning
partner's dashboard will show massage services they cannot perform, and vice versa.

**No migration required.** The `services.category_id` column already exists (it was set
in Sprint 1 migration 026 via the `service_categories` FK). The fix is a pure query change.

**Technical approach:**

Step 1: Add `category_id` to the `allServices` query select.
Step 2: After both queries resolve, extract the set of `category_id` values from the
        provider's existing `provider_services` (the `myServices` result).
Step 3: If the provider has at least one enabled service → filter `allServices` to those
        `category_id` values only.
Step 4: If the provider has no `provider_services` rows yet (new provider) → show all
        services (unchanged behavior — acceptable MVP fallback; admin sets services
        during onboarding).

```typescript
// After Promise.all resolves:
const enabledCategoryIds = new Set(
  (myServices ?? [])
    .map((r) => allServicesMap.get(r.service_id)?.category_id)
    .filter(Boolean)
);

const filteredServices = enabledCategoryIds.size > 0
  ? (allServices ?? []).filter((s) => enabledCategoryIds.has(s.category_id))
  : (allServices ?? []);
```

**Files:**
- `app/[locale]/dashboard/diensten/page.tsx` — update `getServicesData()`:
  1. Add `category_id` to services select
  2. Add `ServiceRow.categoryId` to the return type
  3. Apply category filter logic above

**Estimated complexity:** Low (4–6 lines change)
**Estimated risk:** Low — self-contained dashboard read; no payment/auth/RLS involvement
**Architecture impact:** None
**Subsystem:** D (Provider Dashboard)
**Build check required:** Yes — `npm run lint && npm run build`

---

### S2-C — Property Type Selector + Booking Flow (Subsystem A)

**Objective:** A customer booking a cleaning service sees a property type selector in
Step 1. Their selection is stored in `bookings.customer_notes`.

> ⚠️ **Mandatory:** Read `docs/STABLE_MODULES.md` completely before touching any file
> in Subsystem A. All 9 invariants must remain intact after this task.

**Why it's needed:**
A cleaning booking without property type context forces the cleaner to ask separately,
degrading the experience. The `customer_notes` column in `bookings` is the designated
storage field (no schema change needed).

**How to determine if a service is "cleaning":**
The booking page data chain must expose the service category slug to the booking flow.
Currently, `fetchProviderForBooking` selects `services ( id, name_nl, name_en, duration_minutes, base_price_cents )` — no category info. Adding a join to `service_categories` exposes the slug.

**Files and changes:**

#### 1. `lib/providers/public.ts` — `fetchProviderForBooking` query
Add `service_categories ( slug )` to the services join:
```typescript
services ( id, name_nl, name_en, duration_minutes, base_price_cents,
  service_categories ( slug ) )
```
This exposes `svc.services.service_categories.slug` to the booking flow.

**Risk:** Low. This is a read-only additive SELECT change on a non-sensitive field.
The city gate and status filters are unchanged.

#### 2. `app/[locale]/aanbod/[slug]/boeken/page.tsx` — type update
Update the `Service.services` type to include the category slug:
```typescript
services: {
  id: string; name_nl: string; name_en: string;
  duration_minutes: number; base_price_cents: number;
  service_categories: { slug: string } | null;
} | null;
```
No logic changes. The type must match what `fetchProviderForBooking` now returns.

**Risk:** Low — type-only update; no logic change.

#### 3. `components/booking/property-type-selector.tsx` — NEW component
A client-side radio group rendered inside `ServiceStep`:
```tsx
type PropertyType = 'apartment' | 'house' | 'studio' | 'office';

interface PropertyTypeSelectorProps {
  selected: PropertyType | null;
  onSelect: (type: PropertyType) => void;
}
```
Uses `useTranslations('cleaning')` for all labels (keys added in S2-A).
Renders 4 radio-button-style cards. Returns null if no selection.

**Risk:** Low — isolated new component with no external dependencies.

#### 4. `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx`

Changes:
- Update `Service` type: add `service_categories: { slug: string } | null` field
- Add `propertyType: PropertyType | null` state to `BookingFlow`
- In `ServiceStep`: detect if selected service has `category_slug === 'cleaning'`; if so, render `<PropertyTypeSelector>` below the service list
- `ServiceStep` receives new props: `onPropertyType` callback + `propertyType` value
- In `ConfirmStep`: add a `customer_notes` hidden input containing the property type value
- In `ConfirmStep` summary rows: show property type when present

The `totalSteps` count does NOT change — property type is embedded in Step 1.
`isHybrid` / `isStudioOnly` / step routing logic is **unchanged**.

**Invariant check (STABLE_MODULES.md):**
- `createServiceRoleClient()` used for booking INSERT ✅ (unchanged)
- No financial values from client ✅ (property type goes to `customer_notes`, not price)
- `appointment_type` allowlist check ✅ (unchanged — cleaning is `mobile_only → at_home`)
- Booking state machine ✅ (unchanged)
- Stripe session creation ✅ (unchanged)

**Risk:** Medium — touches Subsystem A; requires careful invariant check

#### 5. `app/[locale]/aanbod/[slug]/boeken/actions.ts`
Add `customer_notes` read and insert:
```typescript
const customerNotes = (formData.get('customer_notes') as string | null) || null;
```
Add to the `bookings` insert object:
```typescript
customer_notes: customerNotes,
```
This is a nullable additive field — no existing logic is affected. The field is not
financial, not a snapshot, and not security-sensitive.

**Risk:** Low — additive nullable field to an existing safe insert path

---

## Files Verified as NOT Affected by Sprint 2

| File | Why Not Affected |
|---|---|
| `app/api/availability/route.ts` | Fully duration-agnostic. Loop condition `current + duration ≤ windowEnd` already handles 3–5h blocks correctly. Verified in audit. ✅ |
| `app/api/stripe/webhook/route.ts` | Category-agnostic. Cleaning booking payment webhook path is identical. |
| `supabase/migrations/*` | `bookings.customer_notes` already exists. `services.category_id` already exists. No schema change. |
| `proxy.ts` | Route protection unchanged. |
| `lib/types/database.ts` | No schema change → no type change needed. |
| `app/[locale]/dashboard/diensten/services-form.tsx` | Receives `ServiceRow[]` from `page.tsx`; after S2-B fix, receives only the correct category's services. No form logic change needed. |
| All admin pages | No Sprint 2 change. Sprint 7 adds admin cleaning filters. |
| All SEO landing pages | Not public yet (Groningen `publicVisible: false`). Sprint 8. |
| `messages/nl.json` (existing keys) | Only additive: new `cleaning.*` namespace. No existing keys renamed/removed. |
| `lib/cities.ts` | No change. |

---

## Availability API Verification (Sprint 2 Exit Criterion)

The Sprint 2 exit criterion states: "A 4h cleaning slot correctly blocks 4h on the
availability calendar."

**Verified in this audit without code change:**

`app/api/availability/route.ts` lines 95–104:
```typescript
for (
  let current = new Date(windowStart);
  current.getTime() + duration * 60_000 <= windowEnd.getTime();
  current = new Date(current.getTime() + 30 * 60_000)
) {
```

The loop condition `current + duration ≤ windowEnd` means:
- For `duration=240` (4h) and window `08:00–17:00` (540 min): last slot = 13:00
- A slot at 13:00 ends at 17:00 — exactly at window end ✅
- A slot at 13:30 would end at 17:30 — excluded ✅
- The `overlaps()` function correctly blocks the full 4h range against existing confirmed bookings ✅

**No code change required for this exit criterion.** Mark as ✅ at sprint start.

---

## Technical Debt from Sprint 1 — Resolution Status

| Debt | Resolution in Sprint 2 |
|---|---|
| **Debt 1** — `dashboard/diensten` shows all categories | ✅ Fixed in S2-B |
| **Debt 2** — `lib/types/marketplace.ts` stale comment (`// 'Utrecht' for MVP`) | Not Sprint 2 scope. Low urgency doc debt. Fix opportunistically. |
| **Debt 3** — `voor-masseurs/page.tsx` Utrecht/massage-only copy | Deferred to Sprint 3 (`voor-schoonmakers` page). |

---

## Risk Register

### Risk 1 — Booking Flow Invariant Violation (Subsystem A)

**Risk:** A change to `booking-flow.tsx` or `actions.ts` accidentally removes a
security invariant (e.g., client-provided price trusted, appointment_type bypass).

**Probability:** Low if STABLE_MODULES.md is read before implementation.

**Mitigation:**
- Read `docs/STABLE_MODULES.md` before touching S2-C files (required by AI_WORKFLOW.md)
- `customer_notes` is a nullable, non-financial field — cannot affect payment path
- `appointment_type` allowlist check in `actions.ts` is untouched
- `npm run lint && npm run build` required after S2-C

---

### Risk 2 — Category Detection by Slug Breaks for Future Categories

**Risk:** Property type selector is wired to `category_slug === 'cleaning'`. If a
future category (e.g., 'gardening') also needs a property type selector, the condition
must be extended.

**Probability:** Low for Sprint 2 (only cleaning is being built).
**Impact:** Low — the check is a single string comparison in one file.
**Mitigation:** The condition is intentionally simple for MVP. Document as known tech debt.

---

### Risk 3 — S2-C Deployed Before S2-A (Missing i18n Keys)

**Risk:** `PropertyTypeSelector` uses `useTranslations('cleaning')`. If deployed before
S2-A adds the keys, the component throws `Missing message: cleaning.propertyTypeLabel`.

**Probability:** Low — both are in the same sprint and should be in the same PR.
**Mitigation:** Implement S2-A first. Confirm keys exist in both message files before
touching `booking-flow.tsx`.

---

## Sprint 2 Change Summary

```
FILES TO CREATE:  1  (components/booking/property-type-selector.tsx)
FILES TO MODIFY:  5  (messages/nl.json, messages/en.json,
                      dashboard/diensten/page.tsx,
                      lib/providers/public.ts,
                      booking-flow.tsx, boeken/actions.ts,
                      boeken/page.tsx — type update only)
FILES TO DELETE:  0
MIGRATIONS:       0
RLS CHANGES:      0
BOOKING CHANGES:  additive only (customer_notes added to insert)
PAYMENT CHANGES:  0
AUTH CHANGES:     0
```

> Note: `boeken/page.tsx` requires a type update to match the extended
> `fetchProviderForBooking` return shape — this is a 4-line change and
> is bundled into S2-C.

| File | Task | Change Type | Complexity | Risk |
|---|---|---|---|---|
| `messages/nl.json` | S2-A | Additive (new namespace) | Low | Low |
| `messages/en.json` | S2-A | Additive (new namespace) | Low | Low |
| `app/[locale]/dashboard/diensten/page.tsx` | S2-B | Query + filter logic | Low | Low |
| `lib/providers/public.ts` | S2-C | Additive SELECT join | Low | Low |
| `app/[locale]/aanbod/[slug]/boeken/page.tsx` | S2-C | Type update only | Low | Low |
| `components/booking/property-type-selector.tsx` | S2-C | New file | Low | Low |
| `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx` | S2-C | State + conditional UI | Medium | Medium |
| `app/[locale]/aanbod/[slug]/boeken/actions.ts` | S2-C | Additive field | Low | Low |

**No file in Sprint 2 has HIGH or CRITICAL architecture impact.**
**No migration is required.**

---

## Sprint 2 Exit Criteria

- [ ] **S2-A**: NL/EN copy for `cleaning.*` namespace in both message files
- [ ] **S2-B**: `dashboard/diensten` shows only category-matched services per provider
- [ ] **S2-C**: Property type selector renders in booking Step 1 for cleaning services only
- [ ] **S2-C**: Property type stored in `bookings.customer_notes` on form submit
- [ ] **S2-avail**: Availability API handles 4h slots correctly ✅ (verified in audit — no code needed)
- [ ] `npm run lint && npm run build` pass with zero errors after S2-B and S2-C

---

## Recommended Sub-Task Order

```
S2-A (i18n — Subsystem C)
  │
  ▼
S2-B (Dashboard filter — Subsystem D)   ← independent of S2-A; can swap order
  │
  ▼
S2-C (Booking flow — Subsystem A)       ← depends on S2-A for i18n keys
  │
  ▼
Sprint 2 Complete
```

S2-B is independent and can be done before or after S2-A.
S2-C must follow S2-A (i18n keys required at build time).

---

*Audit complete. Select which sub-task to start: S2-A, S2-B, or S2-C.*
