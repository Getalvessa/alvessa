-- =============================================================
-- Migration 021: Restrict REST Column Exposure (Column-Level Security)
-- Project: Alvessa Marketplace
-- Purpose: Enforce column-level access control via PostgreSQL
--          column privileges for the anon and authenticated roles.
--          Complements existing RLS row policies — RLS controls which
--          ROWS are visible; this migration controls which COLUMNS
--          are visible within those rows via the Supabase REST API.
--
-- Strategy:
--   For each restricted table:
--     1. REVOKE table-level SELECT from the role (removes wildcard grant)
--     2. GRANT SELECT on only the safe/allowed columns
--
--   The service_role is NOT touched — it retains full column access
--   (used by server actions, Stripe webhook, admin server-side reads).
--   INSERT, UPDATE, and DELETE grants are NOT touched.
--   RLS row policies are NOT changed.
--
-- Columns marked ⊗ in the schema snapshot must never reach REST clients.
-- This migration enforces that at the database layer, not just the API layer.
-- =============================================================

-- ============================================================
-- Baseline: revoke wildcard SELECT from PUBLIC on all restricted tables.
-- PostgreSQL may grant SELECT to PUBLIC by default in some configurations.
-- Explicitly revoking ensures no access path exists via the PUBLIC role
-- before the safe column-level grants below are applied.
-- ============================================================

REVOKE SELECT ON public.providers FROM PUBLIC;
REVOKE SELECT ON public.profiles FROM PUBLIC;
REVOKE SELECT ON public.availability_exceptions FROM PUBLIC;
REVOKE SELECT ON public.bookings FROM PUBLIC;

-- ============================================================
-- providers
-- Excluded from anon and authenticated:
--   stripe_account_id⊗        — Stripe Connect ID (financial secret)
--   stripe_onboarding_completed — internal Stripe state
--   studio_address             — full address revealed only after confirmed booking
--   internal_score⊗           — admin-only governance signal
--   internal_notes⊗           — admin operations notes
--   referred_by_provider_id    — internal trust network data
--   status                     — admin-only lifecycle field
--   trust_level                — admin-only governance field
-- ============================================================

REVOKE SELECT ON public.providers FROM anon;
GRANT SELECT (
  id, profile_id, slug, bio, city, service_area_km, certifications,
  is_verified, is_active, avg_rating, total_reviews,
  service_mode, mobile_radius_km, mobile_travel_fee_cents, mobile_notes,
  studio_city, studio_postcode, studio_notes,
  created_at, updated_at
) ON public.providers TO anon;

REVOKE SELECT ON public.providers FROM authenticated;
GRANT SELECT (
  id, profile_id, slug, bio, city, service_area_km, certifications,
  is_verified, is_active, avg_rating, total_reviews,
  service_mode, mobile_radius_km, mobile_travel_fee_cents, mobile_notes,
  studio_city, studio_postcode, studio_notes,
  created_at, updated_at
) ON public.providers TO authenticated;

-- ============================================================
-- profiles
-- anon:          expose only display identity columns
--                (an anon row-access policy DOES exist — active verified
--                 provider profiles are readable by anon; these three
--                 columns are the safe subset visible to unauthenticated
--                 visitors)
-- authenticated: exclude phone (PII) and deleted_at (GDPR marker)
--                Preserved: id, display_name, avatar_url, role flags,
--                created_at, updated_at — required by proxy.ts auth
--                checks (is_provider, is_admin) and normal page renders.
-- ============================================================

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, display_name, avatar_url
) ON public.profiles TO anon;

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, display_name, avatar_url,
  is_customer, is_provider, is_admin,
  created_at, updated_at
) ON public.profiles TO authenticated;

-- ============================================================
-- availability_exceptions
-- anon:          expose only booking-calendar columns; exclude:
--                  id            — internal PK not needed by calendar renderer
--                  reason        — internal provider note (never public)
--                  created_at    — not needed by calendar renderer
-- authenticated: exclude reason only; providers need id + created_at
--                to manage (DELETE by PK) their own exception rows.
-- ============================================================

REVOKE SELECT ON public.availability_exceptions FROM anon;
GRANT SELECT (
  provider_id, exception_date, is_blocked, start_time, end_time
) ON public.availability_exceptions TO anon;

REVOKE SELECT ON public.availability_exceptions FROM authenticated;
GRANT SELECT (
  id, provider_id, exception_date, is_blocked, start_time, end_time,
  created_at
) ON public.availability_exceptions TO authenticated;

-- ============================================================
-- bookings
-- anon:  no change (no anon SELECT row policy exists on bookings)
-- authenticated: exclude precise location PII:
--   address_line   — street + number (most identifying)
--   address_lat    — GPS latitude
--   address_lng    — GPS longitude
--   address_notes  — door codes, floor numbers (most sensitive)
--   address_city is PRESERVED (non-identifying per GDPR design;
--   retained for analytics — see migration 005 design notes)
--
-- Preserved columns cover all needs for:
--   • customer "mijn-boekingen" list view
--   • provider dashboard booking list + status updates
--   • admin booking management table
-- When address is operationally required (provider en route to
-- a confirmed at_home appointment), it must be fetched via a
-- server action using createServiceRoleClient().
-- ============================================================

REVOKE SELECT ON public.bookings FROM authenticated;
GRANT SELECT (
  id, customer_id, provider_id, provider_service_id,
  status, scheduled_at, duration_minutes, end_at,
  service_name_nl_snapshot, service_name_en_snapshot,
  service_price_cents_snapshot,
  provider_display_name_snapshot, provider_slug_snapshot,
  address_city,
  total_cents, platform_fee_cents, provider_earnings_cents,
  cancellation_reason, cancelled_by, cancelled_at,
  customer_notes, appointment_type, reassigned_from_provider_id,
  created_at, updated_at
) ON public.bookings TO authenticated;

-- ================================================================
-- ROLLBACK SQL
-- Run in this order to restore table-level SELECT grants:
--
-- Step 1: revoke the column-level grants added by this migration
--   REVOKE SELECT (
--     id, profile_id, slug, bio, city, service_area_km, certifications,
--     is_verified, is_active, avg_rating, total_reviews,
--     service_mode, mobile_radius_km, mobile_travel_fee_cents, mobile_notes,
--     studio_city, studio_postcode, studio_notes,
--     created_at, updated_at
--   ) ON public.providers FROM anon;
--   REVOKE SELECT (
--     id, profile_id, slug, bio, city, service_area_km, certifications,
--     is_verified, is_active, avg_rating, total_reviews,
--     service_mode, mobile_radius_km, mobile_travel_fee_cents, mobile_notes,
--     studio_city, studio_postcode, studio_notes,
--     created_at, updated_at
--   ) ON public.providers FROM authenticated;
--
--   REVOKE SELECT (id, display_name, avatar_url)
--     ON public.profiles FROM anon;
--   REVOKE SELECT (id, display_name, avatar_url,
--     is_customer, is_provider, is_admin, created_at, updated_at)
--     ON public.profiles FROM authenticated;
--
--   REVOKE SELECT (provider_id, exception_date, is_blocked, start_time, end_time)
--     ON public.availability_exceptions FROM anon;
--   REVOKE SELECT (id, provider_id, exception_date, is_blocked, start_time, end_time, created_at)
--     ON public.availability_exceptions FROM authenticated;
--
--   REVOKE SELECT (
--     id, customer_id, provider_id, provider_service_id,
--     status, scheduled_at, duration_minutes, end_at,
--     service_name_nl_snapshot, service_name_en_snapshot,
--     service_price_cents_snapshot,
--     provider_display_name_snapshot, provider_slug_snapshot,
--     address_city,
--     total_cents, platform_fee_cents, provider_earnings_cents,
--     cancellation_reason, cancelled_by, cancelled_at,
--     customer_notes, appointment_type, reassigned_from_provider_id,
--     created_at, updated_at
--   ) ON public.bookings FROM authenticated;
--
-- Step 2: restore table-level SELECT grants to anon and authenticated
--   (matches the Supabase role defaults before this migration)
--   NOTE: GRANT SELECT TO PUBLIC is intentionally NOT included here.
--   The REVOKE FROM PUBLIC added by this migration is a one-way hardening
--   step. Restoring it would re-expose these tables to the PUBLIC role,
--   which is not a safe or intended state for this project.
--   GRANT SELECT ON public.providers               TO anon, authenticated;
--   GRANT SELECT ON public.profiles                TO anon, authenticated;
--   GRANT SELECT ON public.availability_exceptions TO anon, authenticated;
--   GRANT SELECT ON public.bookings                TO authenticated;
-- ================================================================
