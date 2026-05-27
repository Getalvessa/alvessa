-- =============================================================
-- Migration 014: Bookings UPDATE — Narrow RLS + Field Immutability
-- Project: Zenzo Marketplace
-- Purpose: Prevent customers and providers from directly modifying
--          financial, identity, and snapshot fields on bookings.
--
-- Problem (migration 006):
--   "bookings: customers can cancel own" had:
--     WITH CHECK (customer_id = auth.uid())
--   This allowed a customer to update ANY column (total_cents,
--   status='confirmed', snapshot fields, provider_id, etc.) as long
--   as they owned the booking and it was in a cancellable state.
--
--   "bookings: providers can update own" had:
--     WITH CHECK (provider_id = get_my_provider_id())
--   Same problem — any column could be changed by the provider.
--
-- Fix:
--   Layer 1 — Narrow the WITH CHECK expressions on both policies
--             so the resulting row must satisfy the expected
--             post-condition (customer: status=cancelled;
--             provider: status in {confirmed, completed, cancelled}).
--
--   Layer 2 — BEFORE UPDATE trigger that enforces column-level
--             immutability for any non-admin, non-service-role call.
--             This mirrors the pattern used in migration 008 for the
--             providers table.
--
-- Bypasses (trigger allows unconditionally):
--   1. auth.uid() IS NULL   → service_role (Stripe webhook, etc.)
--   2. profiles.is_admin    → admin server actions
--
-- Trigger execution order (alphabetical for BEFORE triggers):
--   bookings_clear_address_on_terminal  (migration 005 — fires first)
--   bookings_prevent_field_tampering    (this migration — fires second)
--   bookings_set_end_at                 (migration 005)
--   bookings_updated_at                 (migration 005)
--
--   The address-clearing trigger runs BEFORE this trigger, so we
--   intentionally do NOT guard address_* columns here — those are
--   cleared by the trusted system trigger and are not financial fields.
--
-- Columns made immutable for customers and providers:
--   customer_id, provider_id, provider_service_id,
--   total_cents, platform_fee_cents,
--   scheduled_at, duration_minutes, appointment_type,
--   service_name_nl_snapshot, service_name_en_snapshot,
--   service_price_cents_snapshot, provider_display_name_snapshot,
--   provider_slug_snapshot
--
-- Customers can update:
--   status → 'cancelled' only (AND cancelled_by must = 'customer')
--   cancellation_reason, cancelled_at (when cancelling)
--
-- Providers can update:
--   status → 'confirmed' | 'completed' | 'cancelled' only
--   cancelled_by, cancelled_at, cancellation_reason (when cancelling)
-- =============================================================

-- ================================================================
-- LAYER 1: Replace over-broad UPDATE policies with narrow versions
-- ================================================================

-- ── Customer cancel policy ────────────────────────────────────────
-- OLD: WITH CHECK (customer_id = auth.uid())         ← any field
-- NEW: WITH CHECK (... AND status = 'cancelled'
--                     AND cancelled_by = 'customer') ← cancel only

DROP POLICY IF EXISTS "bookings: customers can cancel own" ON public.bookings;

CREATE POLICY "bookings: customers can cancel own"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    AND status IN ('pending_payment', 'confirmed')
  )
  WITH CHECK (
    customer_id  = (SELECT auth.uid())
    AND status   = 'cancelled'
    AND cancelled_by = 'customer'
  );

-- ── Provider update policy ────────────────────────────────────────
-- OLD: WITH CHECK (provider_id = get_my_provider_id())  ← any field
-- NEW: WITH CHECK (... AND status IN (...))              ← state machine

DROP POLICY IF EXISTS "bookings: providers can update own" ON public.bookings;

CREATE POLICY "bookings: providers can update own"
  ON public.bookings FOR UPDATE TO authenticated
  USING      (provider_id = public.get_my_provider_id())
  WITH CHECK (
    provider_id = public.get_my_provider_id()
    AND status IN ('confirmed', 'completed', 'cancelled')
  );

-- ================================================================
-- LAYER 2: Column-level immutability trigger
-- ================================================================
-- Guards financial, identity, and snapshot columns against direct
-- modification by authenticated (non-admin, non-service-role) users.
--
-- Note: address_* columns are excluded from this trigger because the
-- bookings_clear_address_on_terminal trigger (migration 005) modifies
-- them on terminal-status transitions and fires first (alphabetically).
-- Address fields carry no financial risk; their lifecycle is governed
-- by the GDPR address-clearing trigger.
-- ================================================================

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
  -- These record point-in-time service and provider data; modifying
  -- them after the fact would corrupt the booking history.
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
  -- This mirrors the tightened RLS WITH CHECK as a second defence layer.
  IF OLD.customer_id = (SELECT auth.uid())
     AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    IF NEW.status != 'cancelled' THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Customers may only change booking status to ''cancelled''';
    END IF;
    -- Require cancelled_by = 'customer' to be set atomically
    IF NEW.cancelled_by IS DISTINCT FROM 'customer' THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'cancelled_by must be ''customer'' when a customer cancels';
    END IF;
  END IF;

  -- ── Provider-specific: restrict to forward state transitions ──
  -- 'pending_payment' and 'payment_failed' are system-only states;
  -- providers may not revert to them.
  IF OLD.provider_id = public.get_my_provider_id()
     AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    IF NEW.status NOT IN ('confirmed', 'completed', 'cancelled') THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Providers may only set status to confirmed, completed, or cancelled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_prevent_field_tampering ON public.bookings;
CREATE TRIGGER bookings_prevent_field_tampering
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_field_tampering();

-- ================================================================
-- rollback:
--
-- -- Remove trigger and function:
-- DROP TRIGGER IF EXISTS bookings_prevent_field_tampering ON public.bookings;
-- DROP FUNCTION IF EXISTS public.prevent_booking_field_tampering();
--
-- -- Restore original customer cancel policy (migration 006):
-- DROP POLICY IF EXISTS "bookings: customers can cancel own" ON public.bookings;
-- CREATE POLICY "bookings: customers can cancel own"
--   ON public.bookings FOR UPDATE TO authenticated
--   USING (
--     customer_id = (SELECT auth.uid())
--     AND status IN ('pending_payment', 'confirmed')
--   )
--   WITH CHECK (customer_id = (SELECT auth.uid()));
--
-- -- Restore original provider update policy (migration 006):
-- DROP POLICY IF EXISTS "bookings: providers can update own" ON public.bookings;
-- CREATE POLICY "bookings: providers can update own"
--   ON public.bookings FOR UPDATE TO authenticated
--   USING      (provider_id = public.get_my_provider_id())
--   WITH CHECK (provider_id = public.get_my_provider_id());
-- ================================================================
