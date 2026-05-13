-- =============================================================
-- Migration 010: Provider reads customer profiles
-- Project: Zenzo Marketplace
-- Purpose: Allow providers to read the display_name of customers
--          who have bookings with them (needed for provider dashboard).
--
-- Without this policy, providers cannot see customer names in their
-- booking list because the existing profiles RLS only allows users
-- to read their own profile row.
-- =============================================================

CREATE POLICY "profiles: providers read customers with bookings"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   public.bookings b
      WHERE  b.customer_id = profiles.id
        AND  b.provider_id = public.get_my_provider_id()
    )
  );

-- ================================================================
-- rollback:
--   DROP POLICY IF EXISTS "profiles: providers read customers with bookings" ON public.profiles;
-- ================================================================
