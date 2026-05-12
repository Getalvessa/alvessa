-- =============================================================
-- Migration 006: Row Level Security Policies
-- Project: Zenzo Marketplace
-- Purpose: Enable RLS on all tables and define per-table access
--          control policies.
--
-- Access levels in Supabase:
--   anon          — unauthenticated (public) visitors
--   authenticated — logged-in users of any role
--   service_role  — Supabase server key; bypasses RLS entirely.
--                   Used by: Stripe webhook handlers, admin scripts,
--                   and the handle_new_user() auth trigger.
--
-- Helper functions (defined in migration 002):
--   public.is_admin()          → BOOLEAN
--   public.get_my_provider_id() → UUID | NULL
--
-- Column-level security:
--   PostgreSQL RLS controls ROW access; it does not restrict columns.
--   Sensitive columns (e.g. providers.stripe_account_id, profiles.phone)
--   must be excluded at the API layer — server actions and route handlers
--   must never SELECT * and must use column allow-lists.
--
-- Policy combination:
--   Multiple PERMISSIVE policies on the same table/operation are ORed.
--   A row is returned/updated if ANY matching policy allows it.
--
-- NOTE: (SELECT auth.uid()) instead of auth.uid() is used throughout.
--   This prevents PostgreSQL from re-evaluating auth.uid() for every
--   row in a query; with SELECT it is evaluated once per statement.
-- =============================================================

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Own profile: readable by the profile owner
CREATE POLICY "profiles: owner can read own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Admins can read all profiles
CREATE POLICY "profiles: admins read all"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

-- Users insert their own profile (normally handled by handle_new_user trigger;
-- this policy acts as a belt-and-suspenders guard)
CREATE POLICY "profiles: owner can insert own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- Users can update their own profile
-- Field restrictions (e.g. preventing is_admin self-elevation) enforced at API layer
CREATE POLICY "profiles: owner can update own"
  ON public.profiles FOR UPDATE TO authenticated
  USING  (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Admins can update any profile (e.g. grant provider role, flag deletion)
CREATE POLICY "profiles: admins update any"
  ON public.profiles FOR UPDATE TO authenticated
  USING  (public.is_admin());

-- DELETE: intentionally absent. Use deleted_at (soft delete + anonymise PII).

-- ============================================================
-- providers
-- ============================================================
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Public (anon): read active + verified providers
-- API layer must exclude private columns (stripe_account_id, etc.)
CREATE POLICY "providers: anon reads active+verified"
  ON public.providers FOR SELECT TO anon
  USING (is_active = true AND is_verified = true);

-- Authenticated: same scope for browsing; own record is handled separately
CREATE POLICY "providers: authenticated reads active+verified"
  ON public.providers FOR SELECT TO authenticated
  USING (is_active = true AND is_verified = true);

-- Providers can read their own full record (including private fields)
-- regardless of is_verified/is_active status
CREATE POLICY "providers: owner reads own"
  ON public.providers FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- Admins can read all provider records
CREATE POLICY "providers: admins read all"
  ON public.providers FOR SELECT TO authenticated
  USING (public.is_admin());

-- Providers create their own provider profile
CREATE POLICY "providers: owner can insert"
  ON public.providers FOR INSERT TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()));

-- Providers update their own record (bio, slug, service area, etc.)
-- is_verified may not be self-set; enforced at API layer
CREATE POLICY "providers: owner can update own"
  ON public.providers FOR UPDATE TO authenticated
  USING  (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

-- Admins update any provider (e.g. verification, deactivation)
CREATE POLICY "providers: admins update any"
  ON public.providers FOR UPDATE TO authenticated
  USING  (public.is_admin());

-- DELETE: intentionally absent. Use is_active = false.

-- ============================================================
-- service_categories
-- ============================================================
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_categories: anon reads active"
  ON public.service_categories FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "service_categories: authenticated reads active"
  ON public.service_categories FOR SELECT TO authenticated
  USING (is_active = true);

-- Full admin control (INSERT / UPDATE / DELETE via service_role or admin key)
CREATE POLICY "service_categories: admins all"
  ON public.service_categories FOR ALL TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- services
-- ============================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services: anon reads active"
  ON public.services FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "services: authenticated reads active"
  ON public.services FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "services: admins all"
  ON public.services FOR ALL TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- provider_services
-- ============================================================
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;

-- Public: active service offerings of active + verified providers
CREATE POLICY "provider_services: anon reads active"
  ON public.provider_services FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.providers p
      WHERE  p.id          = provider_services.provider_id
        AND  p.is_active   = true
        AND  p.is_verified = true
    )
  );

CREATE POLICY "provider_services: authenticated reads active"
  ON public.provider_services FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.providers p
      WHERE  p.id          = provider_services.provider_id
        AND  p.is_active   = true
        AND  p.is_verified = true
    )
  );

-- Providers see all their own service offerings (including inactive)
CREATE POLICY "provider_services: owner reads own"
  ON public.provider_services FOR SELECT TO authenticated
  USING (provider_id = public.get_my_provider_id());

-- Providers manage their own service offerings
CREATE POLICY "provider_services: owner can insert"
  ON public.provider_services FOR INSERT TO authenticated
  WITH CHECK (provider_id = public.get_my_provider_id());

CREATE POLICY "provider_services: owner can update"
  ON public.provider_services FOR UPDATE TO authenticated
  USING  (provider_id = public.get_my_provider_id())
  WITH CHECK (provider_id = public.get_my_provider_id());

-- Admins full control
CREATE POLICY "provider_services: admins all"
  ON public.provider_services FOR ALL TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: intentionally absent. Use is_active = false.

-- ============================================================
-- availability_schedules
-- ============================================================
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;

-- Public: active schedule windows for active + verified providers
-- (Required so the booking calendar renders without login)
CREATE POLICY "availability_schedules: anon reads active providers"
  ON public.availability_schedules FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.providers p
      WHERE  p.id          = availability_schedules.provider_id
        AND  p.is_active   = true
        AND  p.is_verified = true
    )
  );

CREATE POLICY "availability_schedules: authenticated reads active providers"
  ON public.availability_schedules FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.providers p
      WHERE  p.id          = availability_schedules.provider_id
        AND  p.is_active   = true
        AND  p.is_verified = true
    )
  );

-- Providers manage their own schedules (all CRUD)
CREATE POLICY "availability_schedules: owner all"
  ON public.availability_schedules FOR ALL TO authenticated
  USING      (provider_id = public.get_my_provider_id())
  WITH CHECK (provider_id = public.get_my_provider_id());

CREATE POLICY "availability_schedules: admins all"
  ON public.availability_schedules FOR ALL TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- availability_exceptions
-- ============================================================
ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Public: exceptions for active + verified providers
-- Needed so the booking calendar can correctly show blocked dates
-- NOTE: the `reason` column (internal provider note) is technically
-- visible here. API layer must exclude it from public responses.
CREATE POLICY "availability_exceptions: anon reads active providers"
  ON public.availability_exceptions FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE  p.id          = availability_exceptions.provider_id
        AND  p.is_active   = true
        AND  p.is_verified = true
    )
  );

CREATE POLICY "availability_exceptions: authenticated reads active providers"
  ON public.availability_exceptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE  p.id          = availability_exceptions.provider_id
        AND  p.is_active   = true
        AND  p.is_verified = true
    )
  );

-- Providers manage their own exceptions (including hard-delete of past dates)
CREATE POLICY "availability_exceptions: owner all"
  ON public.availability_exceptions FOR ALL TO authenticated
  USING      (provider_id = public.get_my_provider_id())
  WITH CHECK (provider_id = public.get_my_provider_id());

CREATE POLICY "availability_exceptions: admins all"
  ON public.availability_exceptions FOR ALL TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- bookings
-- ============================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Customers see their own bookings
CREATE POLICY "bookings: customers read own"
  ON public.bookings FOR SELECT TO authenticated
  USING (customer_id = (SELECT auth.uid()));

-- Providers see bookings assigned to them
-- Address fields (address_line, address_lat, address_lng, address_notes)
-- must be excluded by the API layer for status = pending_payment / cancelled /
-- payment_failed / refunded.  RLS cannot hide individual columns.
CREATE POLICY "bookings: providers read own"
  ON public.bookings FOR SELECT TO authenticated
  USING (provider_id = public.get_my_provider_id());

-- Admins see all bookings
CREATE POLICY "bookings: admins read all"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.is_admin());

-- Customers create new bookings
-- customer_id must equal the caller's own id; caller must be a non-deleted customer
CREATE POLICY "bookings: customers can create"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE  id          = (SELECT auth.uid())
        AND  is_customer = true
        AND  deleted_at  IS NULL
    )
  );

-- Customers cancel their own pending or confirmed bookings
-- Field-level restrictions (status must become 'cancelled', cancelled_by = 'customer')
-- are enforced at the API layer.
CREATE POLICY "bookings: customers can cancel own"
  ON public.bookings FOR UPDATE TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    AND status IN ('pending_payment', 'confirmed')
  )
  WITH CHECK (customer_id = (SELECT auth.uid()));

-- Providers update status of bookings assigned to them
-- Valid state transitions are enforced at the API layer.
CREATE POLICY "bookings: providers can update own"
  ON public.bookings FOR UPDATE TO authenticated
  USING      (provider_id = public.get_my_provider_id())
  WITH CHECK (provider_id = public.get_my_provider_id());

-- Admins can update any booking
CREATE POLICY "bookings: admins update all"
  ON public.bookings FOR UPDATE TO authenticated
  USING  (public.is_admin());

-- DELETE: intentionally absent. Bookings are permanent records.

-- ============================================================
-- payments
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Customers read payments for their own bookings
CREATE POLICY "payments: customers read own"
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE  b.id          = payments.booking_id
        AND  b.customer_id = (SELECT auth.uid())
    )
  );

-- Providers read payments for their own bookings (earnings visibility)
CREATE POLICY "payments: providers read own"
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE  b.id         = payments.booking_id
        AND  b.provider_id = public.get_my_provider_id()
    )
  );

-- Admins read all payment records
CREATE POLICY "payments: admins read all"
  ON public.payments FOR SELECT TO authenticated
  USING (public.is_admin());

-- INSERT / UPDATE: handled exclusively by the Stripe webhook handler
-- running under the service_role key. No authenticated client policy.
-- service_role bypasses RLS, so no policy is needed for those writes.

-- DELETE: intentionally absent. Payments are permanent records.

-- ============================================================
-- reviews
-- ============================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public: published reviews (shown on provider profile pages)
CREATE POLICY "reviews: anon reads published"
  ON public.reviews FOR SELECT TO anon
  USING (is_published = true);

CREATE POLICY "reviews: authenticated reads published"
  ON public.reviews FOR SELECT TO authenticated
  USING (is_published = true);

-- Customers see their own reviews regardless of published state
CREATE POLICY "reviews: customers read own"
  ON public.reviews FOR SELECT TO authenticated
  USING (customer_id = (SELECT auth.uid()));

-- Providers see all reviews about them (including unpublished)
CREATE POLICY "reviews: providers read own"
  ON public.reviews FOR SELECT TO authenticated
  USING (provider_id = public.get_my_provider_id());

-- Admins see all reviews
CREATE POLICY "reviews: admins read all"
  ON public.reviews FOR SELECT TO authenticated
  USING (public.is_admin());

-- Customers submit a review for a completed booking they own
-- The UNIQUE constraint on booking_id prevents duplicate reviews
CREATE POLICY "reviews: customers insert for completed bookings"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE  b.id          = reviews.booking_id
        AND  b.customer_id = (SELECT auth.uid())
        AND  b.status      = 'completed'
    )
  );

-- Reviews are immutable after submission: no UPDATE for customers

-- Admins can toggle is_published (to hide inappropriate reviews)
CREATE POLICY "reviews: admins can update"
  ON public.reviews FOR UPDATE TO authenticated
  USING      (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: intentionally absent. Use is_published = false.

-- ================================================================
-- rollback (list all policies first):
--   SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
--   Then:
--   ALTER TABLE public.reviews                 DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.payments                DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.bookings                DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.availability_exceptions DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.availability_schedules  DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.provider_services       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.services                DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.service_categories      DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.providers               DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.profiles                DISABLE ROW LEVEL SECURITY;
--   (Drop individual policies with DROP POLICY "<name>" ON public.<table>;)
-- ================================================================
