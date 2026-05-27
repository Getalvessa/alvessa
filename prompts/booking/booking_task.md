# Booking / Payment / Availability Task Template

> Use this template for any task touching: booking flow, availability API, Stripe checkout, webhook, or booking status transitions.

---

## Step 0 — Required Reading (always first)

```
Read docs/PROJECT_MAP.md — subsystem A
Read docs/STABLE_MODULES.md — sections 1–4, 6–9
```

Do not proceed until both are read.

---

## Scope Declaration

State this before writing any code:

```
SUBSYSTEM: A — Booking / Payment
TASK: [one sentence]
FILES IN SCOPE: [list only]
FILES OUT OF SCOPE: everything else
STABLE MODULES AFFECTED: [list / None]
```

---

## Allowed Files (read + edit)

```
app/[locale]/aanbod/[slug]/boeken/actions.ts
app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx
app/[locale]/aanbod/[slug]/boeken/page.tsx
app/api/availability/route.ts
app/api/stripe/webhook/route.ts
app/[locale]/boeken/succes/page.tsx
app/[locale]/mijn-boekingen/page.tsx
lib/supabase/server.ts          ← read-only unless task explicitly targets it
```

---

## Forbidden Files (do not read or touch)

```
messages/nl.json / messages/en.json     ← copy task only
supabase/migrations/*                   ← security task only
app/[locale]/dashboard/*                ← provider task only
app/[locale]/admin/*                    ← admin task only
proxy.ts                                ← security task only
node_modules/
```

---

## Non-Negotiable Invariants

Before making any change, verify these invariants remain intact:

### 1. Never trust client pricing
- `priceCents`, `durationMinutes`, all snapshot fields must come from the DB query, never from `formData`.
- `formData` trusted fields: `provider_service_id`, `scheduled_at`, `appointment_type`, `address_*`, `locale` only.

### 2. Booking INSERT is server-only via service_role
- The INSERT in `actions.ts` must use `createServiceRoleClient()`, not the user-scoped `supabase` client.
- There is intentionally no authenticated INSERT policy on the `bookings` table. Do not recreate one.

### 3. Provider cannot confirm an unpaid booking
- Only `service_role` (Stripe webhook) may transition a booking to `status='confirmed'`.
- Provider transitions are limited to: `confirmed → completed` or `confirmed → cancelled`.
- The RLS WITH CHECK and the field-tampering trigger both enforce this independently.

### 4. Availability uses service_role for booking queries
- The `existingBookings` query in `availability/route.ts` must use `createServiceRoleClient()`.
- Using the user-scoped client would hide other customers' bookings and show false availability.

### 5. scheduled_at validation is two-layer
- Layer A (pure checks): valid date, ≥ 2h ahead, ≤ 60 days ahead, on 30-min UTC grid.
- Layer B (DB checks): availability_exceptions + availability_schedules window.
- Both layers must be preserved.

### 6. Redirect URLs are server-derived
- `success_url` and `cancel_url` in Stripe session are built from server values only.
- Never use any `formData` field to build redirect URLs.

---

## Minimum Diff Rule

- Change only what the task requires.
- If you find an unrelated issue while reading, flag it — do not fix it inline.
- Do not reformat, rename, or reorganize code that is not directly related to the task.

---

## Required Output

```
## Task Complete

FILES CHANGED:
- [path] — [what changed and why, one line]

INVARIANTS CHECK:
- [ ] Client pricing never trusted
- [ ] INSERT uses service_role
- [ ] Provider cannot set status=confirmed
- [ ] Availability uses service_role for booking query
- [ ] scheduled_at validation two-layer intact
- [ ] Redirect URLs server-derived

STABLE MODULES AFFECTED: [list / None]

BUILD STATUS:
- npm run lint: [✅ 0 errors / ❌]
- npm run build: [✅ success / ❌]

NEXT: [one sentence]
```
