-- =============================================================
-- Migration 011: Fix infinite recursion in profiles RLS policy
-- Project: Zenzo Marketplace
--
-- Problem: The policy "profiles: providers read customers with bookings"
-- added in migration 010 creates an RLS circular reference:
--
--   bookings INSERT policy → queries profiles
--   profiles policy        → queries bookings  ← circular!
--
-- PostgreSQL detects this as infinite recursion and blocks all
-- booking INSERTs.
--
-- Fix: Wrap the bookings query in a SECURITY DEFINER function
-- (same pattern as get_my_provider_id and is_admin). SECURITY DEFINER
-- bypasses RLS for the inner bookings query, breaking the cycle.
-- =============================================================

-- 1. Create helper function that safely checks the relationship
CREATE OR REPLACE FUNCTION public.provider_has_booking_with_customer(customer_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.bookings b
    WHERE  b.customer_id = customer_profile_id
      AND  b.provider_id = public.get_my_provider_id()
  );
$$;

-- 2. Drop the broken policy and replace with the fixed version
DROP POLICY IF EXISTS "profiles: providers read customers with bookings" ON public.profiles;

CREATE POLICY "profiles: providers read customers with bookings"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.provider_has_booking_with_customer(profiles.id));

-- ================================================================
-- rollback:
--   DROP POLICY IF EXISTS "profiles: providers read customers with bookings" ON public.profiles;
--   DROP FUNCTION IF EXISTS public.provider_has_booking_with_customer(UUID);
-- ================================================================
