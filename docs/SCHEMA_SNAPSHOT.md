---
READ THIS INSTEAD OF MIGRATION HISTORY.
Do NOT scan supabase/migrations/ to understand table structure.
This file is the current schema source of truth.
Last sync: migration 019 (2026-05-27). Update after every migration.
---

# Schema Snapshot — Alvessa Marketplace

## Notation

```
†  admin-only write   (trigger: prevent_provider_integrity_fields)
‡  system-only write  (trigger: update_provider_rating_stats)
⊗  API-layer exclude  (must never appear in public-facing SELECT)
~  GDPR-cleared       (nulled on terminal status by trigger)
→  immutable          (trigger blocks all post-INSERT changes)
*  NOT NULL
```

---

## providers

```
[identity]   id  profile_id*→  slug*  bio  city  service_area_km  certifications
[stripe]     stripe_account_id⊗†  stripe_onboarding_completed†
[listing]    is_active  is_verified†
[ratings]    avg_rating‡  total_reviews‡
[mode]       service_mode  mobile_radius_km  mobile_travel_fee_cents  mobile_notes
             studio_address  studio_city  studio_postcode  studio_notes
[trust]      status†  trust_level†  referred_by_provider_id†  internal_score†⊗  internal_notes†⊗
[system]     created_at  updated_at
```

**Trigger: `prevent_provider_integrity_fields` (BEFORE UPDATE)**
Blocks non-admin from changing: `is_verified`, `avg_rating`, `total_reviews`,
`stripe_account_id`, `stripe_onboarding_completed`, `status`, `trust_level`,
`internal_score`, `internal_notes`, `referred_by_provider_id`.
Bypasses: `auth.uid() IS NULL` (service_role) | `app.system_update='true'` | `is_admin=true`.

**Trigger: `update_provider_rating_stats` (AFTER INSERT/UPDATE/DELETE on reviews)**
Writes `avg_rating` + `total_reviews`. Uses `set_config('app.system_update','true')`.

**INSERT policy** enforces defaults: `status='new'`, `trust_level=0`, `internal_score=0`,
`internal_notes IS NULL`, `referred_by_provider_id IS NULL`, `is_verified=false`,
`avg_rating IS NULL`, `total_reviews=0`, `stripe_account_id IS NULL`.

**Status values:** `new | trusted | core | restricted | banned`

---

## bookings

```
[identity]   id  customer_id*→  provider_id*→  provider_service_id*→
[status]     status (DEFAULT 'pending_payment')
[schedule]   scheduled_at*→  end_at*(computed)  duration_minutes*→
[snapshots]  service_name_nl_snapshot*→  service_name_en_snapshot*→
             service_price_cents_snapshot*→  provider_display_name_snapshot*→
             provider_slug_snapshot*→
[address]    address_line~  address_city  address_lat~  address_lng~  address_notes~
[financial]  total_cents*→  platform_fee_cents→  provider_earnings_cents(generated)
[cancel]     cancellation_reason  cancelled_by  cancelled_at
[misc]       customer_notes  appointment_type→  reassigned_from_provider_id
[system]     created_at  updated_at
```

**Status state machine:**
```
pending_payment → confirmed      (service_role / Stripe webhook ONLY)
pending_payment → payment_failed (service_role / Stripe webhook ONLY)
confirmed       → completed      (provider / admin / service_role)
confirmed       → cancelled      (customer / provider / admin / service_role)
completed       → refunded       (admin / service_role)
cancelled       → refunded       (admin / service_role)
```

**Trigger: `prevent_booking_field_tampering` (BEFORE UPDATE)**
Blocks: all `→` fields. Customer: status only to 'cancelled'. Provider: only to 'completed'|'cancelled'.
Bypasses: `auth.uid() IS NULL` (service_role) | `is_admin=true`.

**Constraint:** EXCLUSION on `tstzrange(scheduled_at, end_at)` WHERE `status='confirmed'` (no overlaps).

**GDPR trigger:** `~` fields nulled when status moves to `cancelled|payment_failed|refunded`.

**INSERT:** service_role only (no authenticated INSERT policy — security by design).

---

## profiles

```
id*(=auth.users.id)  display_name*  phone  avatar_url
is_customer  is_provider  is_admin   (boolean flags, NOT enum — user can hold multiple roles)
deleted_at(GDPR soft-delete)  created_at  updated_at
```

**Trigger: `prevent_profile_privilege_escalation` (BEFORE UPDATE)**
Blocks non-admin from changing `is_admin`, `is_provider`, `is_customer`.
Bypass: `auth.uid() IS NULL`.

**Trigger: `handle_new_user` (AFTER INSERT on auth.users)**
Auto-creates profile with `is_customer=true`. Never hard-delete profiles.

---

## provider_services

```
id  provider_id*→  service_id*→  custom_price_cents  is_active  created_at  updated_at
```

RLS: owner CRUD on own. Anon/auth reads active from active+verified providers only.

---

## payments

```
id  booking_id*(UNIQUE)  stripe_payment_intent_id*(UNIQUE)
stripe_charge_id  stripe_transfer_id  status
amount_cents*  platform_fee_cents  provider_amount_cents  refund_amount_cents  stripe_refund_id
created_at  updated_at
```

Written exclusively by Stripe webhook via service_role. No authenticated INSERT/UPDATE policy.
Status: `pending | processing | paid | failed | refunded`

---

## reviews

```
id  booking_id*(UNIQUE)  customer_id*  provider_id*
rating*(1–5)  comment  is_published  created_at
```

Immutable after INSERT (no updated_at, no UPDATE for customers).
Admin can toggle `is_published`. INSERT validated: booking must be 'completed' AND provider_id must match booking.

---

## admin_audit_log

```
id*(PK)  actor_user_id*(→auth.users)  target_type*  target_id  action*  metadata(jsonb)  created_at*
```

Append-only. No UPDATE/DELETE policies.
RLS: admin SELECT only (`public.is_admin()`). Admin INSERT only (`auth.uid() = actor_user_id AND is_admin()`).
**target_type values:** `provider` | `booking` | `user`
**action values:** `provider.approve` | `provider.deactivate` | `provider.activate` | `provider.trust_update` | `booking.complete` | `booking.cancel`

---

## provider_applications

```
id*(PK)  full_name*  email*  phone*  city*(DEFAULT 'Utrecht')
service_types*  works_mobile*(DEFAULT true)
service_area  experience_years(0–80)  instagram_or_website  message
status*(DEFAULT 'pending', CHECK IN ('pending','approved','rejected'))
created_at*
```

Anonymous INSERT allowed (`status='pending'` enforced by RLS).
Admin SELECT only (`public.is_admin()`). No UPDATE/DELETE policies — manage via Dashboard.
**status values:** `pending | approved | rejected`

---

## Key Helper Functions

```sql
public.is_admin()           → BOOLEAN  (SECURITY DEFINER, reads profiles.is_admin for auth.uid())
public.get_my_provider_id() → UUID     (SECURITY DEFINER, reads providers.profile_id for auth.uid())
```
