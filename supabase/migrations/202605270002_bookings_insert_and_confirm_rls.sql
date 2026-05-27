-- =============================================================
-- Migration 015: Booking INSERT via service_role only +
--               Provider cannot set status='confirmed'
-- Project: Zenzo Marketplace
--
-- Fixes two launch blockers:
--
-- BLOCKER 1 — Forged INSERT via direct REST API call
--   Attack path: authenticated user POSTs directly to /rest/v1/bookings
--   with status='confirmed', total_cents=0, or an arbitrary scheduled_at,
--   bypassing all server action validation.
--   Fix: DROP the "bookings: customers can create" INSERT policy.
--   The createBooking server action is updated to use createServiceRoleClient()
--   for the INSERT, so the authenticated INSERT permission is no longer needed.
--   service_role bypasses RLS entirely; all validation is done server-side
--   before the service_role INSERT executes.
--
-- BLOCKER 2 — Provider directly sets status='confirmed' via REST API
--   Attack path: provider PATCHes /rest/v1/bookings?id=eq.<id> with
--   status='confirmed', getting a free confirmed booking without paying.
--   Fix: Replace the provider UPDATE policy so that:
--     USING  — providers can only update bookings already in 'confirmed' state
--              (cannot touch pending_payment rows at all)
--     WITH CHECK — the resulting row status must be 'completed' or 'cancelled'
--              (cannot keep or set status='confirmed')
--   Additionally, update the prevent_booking_field_tampering trigger (from
--   migration 014) to remove 'confirmed' from the provider-allowed status set,
--   providing a second independent defense layer.
--
-- Role access summary after this migration:
--
--   INSERT bookings:
--     service_role  → allowed (bypasses RLS; used by createBooking server action)
--     authenticated → BLOCKED (no INSERT policy exists)
--
--   Transition to 'confirmed':
--     service_role  → allowed (Stripe webhook via createServiceRoleClient())
--     provider      → BLOCKED (RLS WITH CHECK + trigger)
--     customer      → BLOCKED (no matching UPDATE policy covers this transition)
--     admin         → allowed (trigger bypass for is_admin=true)
--
--   Transition to 'completed':
--     service_role  → allowed
--     provider      → allowed (confirmed → completed)
--     admin         → allowed
--
--   Transition to 'cancelled':
--     service_role  → allowed
--     provider      → allowed (confirmed → cancelled)
--     customer      → allowed (pending_payment|confirmed → cancelled, cancelled_by='customer')
--     admin         → allowed
--
-- Stripe webhook compatibility:
--   The webhook uses createServiceRoleClient() → bypasses RLS → unaffected.
-- =============================================================

-- ================================================================
-- BLOCKER 1: Remove authenticated INSERT permission on bookings
-- ================================================================

DROP POLICY IF EXISTS "bookings: customers can create" ON public.bookings;

-- No replacement policy is created. service_role (used by the server action)
-- bypasses RLS and needs no policy. Authenticated users have no INSERT path.

-- ================================================================
-- BLOCKER 2: Restrict provider UPDATE — cannot set status='confirmed'
-- ================================================================

-- Layer 1: Narrow the RLS UPDATE policy

DROP POLICY IF EXISTS "bookings: providers can update own" ON public.bookings;

CREATE POLICY "bookings: providers can update own"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    -- Providers can only act on bookings that are already confirmed.
    -- pending_payment rows are invisible to this policy — Stripe owns that state.
    provider_id = public.get_my_provider_id()
    AND status = 'confirmed'
  )
  WITH CHECK (
    -- After the update, the status must be 'completed' or 'cancelled'.
    -- 'confirmed' is intentionally excluded: only the Stripe webhook may set it.
    provider_id = public.get_my_provider_id()
    AND status IN ('completed', 'cancelled')
  );

-- Layer 2: Update the field-tampering trigger (defense-in-depth)
-- Mirrors the change above by removing 'confirmed' from the provider-allowed
-- status set. The trigger fires independently of RLS checks, so even if a
-- future policy change re-opens the UPDATE path, the trigger still blocks it.

CREATE OR REPLACE FUNCTION public.prevent_booking_field_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Bypass 1: service_role and system calls carry no JWT
  -- (Stripe webhook, migration scripts, etc.) — allow unconditionally.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bypass 2: platform admins may update any field.
  SELECT COALESCE(is_admin, false) INTO v_is_admin
  FROM   public.profiles
  WHERE  id         = auth.uid()
    AND  deleted_at IS NULL;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- ── Immutable identity fields ─────────────────────────────────
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'customer_id is immutable after booking creation';
  END IF;

  IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'provider_id is immutable after booking creation';
  END IF;

  IF NEW.provider_service_id IS DISTINCT FROM OLD.provider_service_id THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'provider_service_id is immutable after booking creation';
  END IF;

  -- ── Immutable financial fields ────────────────────────────────
  IF NEW.total_cents IS DISTINCT FROM OLD.total_cents THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'total_cents is immutable — agreed price cannot be changed';
  END IF;

  IF NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'platform_fee_cents is immutable';
  END IF;

  -- ── Immutable schedule fields ─────────────────────────────────
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'scheduled_at is immutable — rescheduling requires a new booking';
  END IF;

  IF NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'duration_minutes is immutable';
  END IF;

  IF NEW.appointment_type IS DISTINCT FROM OLD.appointment_type THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'appointment_type is immutable after booking creation';
  END IF;

  -- ── Immutable snapshot fields ─────────────────────────────────
  IF NEW.service_name_nl_snapshot IS DISTINCT FROM OLD.service_name_nl_snapshot THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'snapshot fields are immutable';
  END IF;

  IF NEW.service_name_en_snapshot IS DISTINCT FROM OLD.service_name_en_snapshot THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'snapshot fields are immutable';
  END IF;

  IF NEW.service_price_cents_snapshot IS DISTINCT FROM OLD.service_price_cents_snapshot THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'snapshot fields are immutable';
  END IF;

  IF NEW.provider_display_name_snapshot IS DISTINCT FROM OLD.provider_display_name_snapshot THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'snapshot fields are immutable';
  END IF;

  IF NEW.provider_slug_snapshot IS DISTINCT FROM OLD.provider_slug_snapshot THEN
    RAISE EXCEPTION 'permission_denied'
      USING HINT = 'snapshot fields are immutable';
  END IF;

  -- ── Customer-specific: only cancel is a valid status transition ──
  IF OLD.customer_id = (SELECT auth.uid())
     AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    IF NEW.status != 'cancelled' THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Customers may only change booking status to ''cancelled''';
    END IF;
    IF NEW.cancelled_by IS DISTINCT FROM 'customer' THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'cancelled_by must be ''customer'' when a customer cancels';
    END IF;
  END IF;

  -- ── Provider-specific: only completed or cancelled are valid transitions ──
  -- 'confirmed' is removed: only the Stripe webhook (service_role, auth.uid()=NULL)
  -- may transition a booking to 'confirmed'. This is defense-in-depth — the RLS
  -- WITH CHECK on the provider UPDATE policy already blocks 'confirmed', but the
  -- trigger provides an independent second layer.
  IF OLD.provider_id = public.get_my_provider_id()
     AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    IF NEW.status NOT IN ('completed', 'cancelled') THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Providers may only set booking status to completed or cancelled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists from migration 014; CREATE OR REPLACE above updates the function.
-- Re-create the trigger to ensure it points to the updated function body.
DROP TRIGGER IF EXISTS bookings_prevent_field_tampering ON public.bookings;
CREATE TRIGGER bookings_prevent_field_tampering
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_field_tampering();

-- ================================================================
-- rollback:
--
-- -- Restore customer INSERT policy (migration 006):
-- CREATE POLICY "bookings: customers can create"
--   ON public.bookings FOR INSERT TO authenticated
--   WITH CHECK (
--     customer_id = (SELECT auth.uid())
--     AND EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE  id          = (SELECT auth.uid())
--         AND  is_customer = true
--         AND  deleted_at  IS NULL
--     )
--   );
--
-- -- Restore provider UPDATE policy (migration 014):
-- DROP POLICY IF EXISTS "bookings: providers can update own" ON public.bookings;
-- CREATE POLICY "bookings: providers can update own"
--   ON public.bookings FOR UPDATE TO authenticated
--   USING      (provider_id = public.get_my_provider_id())
--   WITH CHECK (
--     provider_id = public.get_my_provider_id()
--     AND status IN ('confirmed', 'completed', 'cancelled')
--   );
--
-- -- Re-apply the migration 014 version of the trigger function:
-- --   (copy the function body from 202605270001_bookings_update_rls.sql)
-- ================================================================
