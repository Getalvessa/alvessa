-- =============================================================
-- Migration 013: Service Mode & Appointment Type
-- Purpose: Allow providers to define how they deliver services.
--
-- service_mode (providers):
--   studio_only — customer visits provider's studio
--   mobile_only — provider travels to customer
--   hybrid      — both options available
--
-- appointment_type (bookings):
--   in_studio — customer visited the studio
--   at_home   — provider visited the customer
--
-- Design:
--   All new columns use IF NOT EXISTS / safe defaults.
--   No existing rows or constraints are removed.
--   studio_address is intentionally omitted from the public-facing
--   columns — full address is shown only after confirmed booking,
--   not on the public listing or profile page.
-- =============================================================

-- ── providers: service_mode ───────────────────────────────────────────────────
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS service_mode TEXT NOT NULL DEFAULT 'studio_only'
    CHECK (service_mode IN ('studio_only', 'mobile_only', 'hybrid'));

-- ── providers: mobile fields ──────────────────────────────────────────────────
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS mobile_radius_km INTEGER
    CHECK (mobile_radius_km IS NULL OR (mobile_radius_km BETWEEN 1 AND 100));

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS mobile_travel_fee_cents INTEGER DEFAULT 0
    CHECK (mobile_travel_fee_cents IS NULL OR mobile_travel_fee_cents >= 0);

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS mobile_notes TEXT;

-- ── providers: studio fields ──────────────────────────────────────────────────
-- studio_address is stored but NOT included in public SELECT queries.
-- It is only exposed to confirmed customers via the booking detail flow.
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS studio_address TEXT;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS studio_city TEXT;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS studio_postcode TEXT;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS studio_notes TEXT;

-- ── Index for listing page filter ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_providers_service_mode
  ON public.providers (service_mode)
  WHERE is_active = true AND is_verified = true;

-- ── bookings: appointment_type ────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'at_home'
    CHECK (appointment_type IN ('in_studio', 'at_home'));

-- ================================================================
-- rollback:
--   ALTER TABLE public.bookings  DROP COLUMN IF EXISTS appointment_type;
--   DROP INDEX  IF EXISTS idx_providers_service_mode;
--   ALTER TABLE public.providers DROP COLUMN IF EXISTS studio_notes;
--   ALTER TABLE public.providers DROP COLUMN IF EXISTS studio_postcode;
--   ALTER TABLE public.providers DROP COLUMN IF EXISTS studio_city;
--   ALTER TABLE public.providers DROP COLUMN IF EXISTS studio_address;
--   ALTER TABLE public.providers DROP COLUMN IF EXISTS mobile_notes;
--   ALTER TABLE public.providers DROP COLUMN IF EXISTS mobile_travel_fee_cents;
--   ALTER TABLE public.providers DROP COLUMN IF EXISTS mobile_radius_km;
--   ALTER TABLE public.providers DROP COLUMN IF EXISTS service_mode;
-- ================================================================
