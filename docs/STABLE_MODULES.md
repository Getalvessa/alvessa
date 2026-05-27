# Stable Modules — Do Not Touch Without Explicit Security/Bug Task

> These modules have been deliberately designed, reviewed, and hardened. They must not be modified as part of unrelated tasks, refactors, or "while I'm in here" cleanup.
>
> **Rule:** If a task does not explicitly name one of these modules as its target, treat these files as read-only.

---

## 1. Booking Pricing Integrity

**What it protects:** Price, duration, and snapshot values in a booking are always derived from the database on the server — never from client input.

**Location:** `app/[locale]/aanbod/[slug]/boeken/actions.ts`

**Key invariant:**
- `priceCents`, `durationMinutes`, `serviceNameNl/En`, `providerDisplayName`, `providerSlug` come exclusively from the Supabase DB query.
- `formData` only supplies: `provider_service_id`, `scheduled_at`, `appointment_type`, `address_*`, `locale`.
- Never add `total_cents` or `platform_fee_cents` to the trusted `formData` fields.

---

## 2. Booking INSERT — service_role Only

**What it protects:** Prevents authenticated users from POSTing forged bookings directly to `/rest/v1/bookings`.

**Location:**
- `app/[locale]/aanbod/[slug]/boeken/actions.ts` — INSERT uses `createServiceRoleClient()`
- `supabase/migrations/202605270002_bookings_insert_and_confirm_rls.sql` — DROP of `"bookings: customers can create"` policy

**Key invariant:**
- The authenticated INSERT policy is intentionally absent. Do not recreate it.
- The server action uses `createServiceRoleClient()` for the INSERT — not the user-scoped `supabase` client.

---

## 3. Booking UPDATE RLS — Field Tampering Trigger

**What it protects:** Immutable booking fields (customer_id, provider_id, provider_service_id, total_cents, scheduled_at, snapshots) cannot be changed after creation by any authenticated user.

**Location:**
- `supabase/migrations/202605270001_bookings_update_rls.sql` — `prevent_booking_field_tampering` trigger
- `supabase/migrations/202605270002_bookings_insert_and_confirm_rls.sql` — updated trigger (removed 'confirmed' from provider set)

**Key invariant:**
- The trigger fires independently of RLS — it is a second defense layer.
- `auth.uid() IS NULL` → bypass (service_role / Stripe webhook).
- `is_admin = true` → bypass (platform admin).
- All other callers: field mutations raise `permission_denied`.

---

## 4. Provider Cannot Confirm Unpaid Booking

**What it protects:** Prevents a provider from PATCHing a `pending_payment` booking to `status='confirmed'`, getting a free booking without paying.

**Location:**
- `supabase/migrations/202605270002_bookings_insert_and_confirm_rls.sql`

**Key invariants:**
- RLS USING clause: `status = 'confirmed'` — providers cannot even see `pending_payment` rows in UPDATE context.
- RLS WITH CHECK: `status IN ('completed', 'cancelled')` — setting `status='confirmed'` is blocked.
- Trigger: provider status transitions restricted to `('completed', 'cancelled')` — independent second layer.
- **Only** `service_role` (Stripe webhook) may transition a booking to `confirmed`.

---

## 5. Proxy / Middleware Role Protection

**What it protects:** `/dashboard/*` and `/admin/*` routes are protected at the middleware level. UI-level guards alone are not sufficient.

**Location:** `proxy.ts`

**Key invariant:**
- Route protection must be enforced in middleware, not only in page components.
- Do not weaken or remove route matchers for protected paths.
- The middleware matcher intentionally excludes `/api/*` — do not add API routes to the matcher.

---

## 6. Stripe Webhook Conflict Handling

**What it protects:** The Stripe webhook uses `createServiceRoleClient()` and bypasses RLS to confirm bookings. It must not be subject to the provider UPDATE policy.

**Location:** `app/api/stripe/webhook/route.ts`

**Key invariant:**
- `service_role` calls carry `auth.uid() = NULL` — the trigger and RLS policies both bypass for this case.
- Webhook idempotency: a second `payment_intent.succeeded` event for the same booking_id must not fail or create a duplicate.

---

## 7. Open Redirect Protection

**What it protects:** Redirect URLs in booking flow must not be user-controlled (open redirect vulnerability).

**Location:** `app/[locale]/aanbod/[slug]/boeken/actions.ts`

**Key invariant:**
- `success_url` and `cancel_url` in Stripe session creation are built from server-derived values (`providerSlug`, `booking.id`, `locale`) — never from `formData`.
- The base URL is derived from `headers()` (`host` + `x-forwarded-proto`), not from any client input.

---

## 8. Availability RLS Blind Spot Fix

**What it protects:** The availability API uses `createServiceRoleClient()` to query confirmed bookings, because the user-scoped client (limited by RLS) would only see the requesting user's own bookings — leaving other customers' confirmed slots invisible and showing false availability.

**Location:** `app/api/availability/route.ts` (line ~81)

**Key invariant:**
- The `existingBookings` query must use `createServiceRoleClient()` — never the user-scoped client.
- Only `scheduled_at` and `end_at` are selected — no PII is exposed.

---

## 9. scheduled_at Validation (Two-Layer)

**What it protects:** Prevents bookings in the past, too far in the future, off the 30-minute grid, or outside provider working hours.

**Location:** `app/[locale]/aanbod/[slug]/boeken/actions.ts`

**Key invariants:**
- Layer A (pure): date valid, not past (+ 2h buffer), not > 60 days ahead, on 30-min UTC grid.
- Layer B (DB): availability_exceptions (blocked day / custom hours) + availability_schedules (weekly window). Slot must fit entirely within the window: `localMin >= windowStart` AND `localMin + durationMinutes <= windowEnd`.
- Both layers must remain. Do not remove Layer A as "redundant" — it prevents unnecessary DB calls.

---

## Modification Policy

Changes to any of the above modules:
1. Must be a dedicated, single-purpose task — no bundling with copy, UI, or unrelated fixes.
2. Must include a written explanation of what changes and why.
3. Must include a rollback plan.
4. Must run `npm run lint` and `npm run build`.
5. Must be reviewed before deployment.
