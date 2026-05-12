-- =============================================================
-- Migration 004: Provider Availability
-- Project: Zenzo Marketplace
-- Purpose: Two-table model for provider availability windows.
--
--   availability_schedules  — recurring weekly windows (e.g. Mon 9–18)
--   availability_exceptions — date-specific overrides (block or custom)
--
-- Design decisions:
--   TIME SLOT GENERATION IS INTENTIONALLY ABSENT FROM THE DATABASE.
--   Available slots are calculated by the application at query time:
--     1. Load provider's availability_schedules for the requested weekday
--     2. Apply availability_exceptions for that date (block or custom hours)
--     3. Subtract time ranges occupied by bookings WHERE status = 'confirmed'
--     4. Return remaining windows as bookable slots
--   Pre-generating slots in the database creates a maintenance burden
--   every time a provider changes their schedule.
--   See docs/ARCHITECTURE_FREEZE.md decision #3.
--
--   day_of_week follows PostgreSQL EXTRACT(DOW FROM ...) convention:
--   0 = Sunday, 1 = Monday, … 6 = Saturday
--
--   Times are stored as TIME (no timezone). All providers operate in
--   the Netherlands (CET/CEST). Application converts to TIMESTAMPTZ
--   when creating bookings.
--
--   availability_exceptions rows may be hard-deleted once their date
--   has passed — unlike bookings/payments, historical exceptions have
--   no ongoing audit value.
-- =============================================================

-- ----------------------------------------------------------------
-- Table: availability_schedules
-- ----------------------------------------------------------------
CREATE TABLE public.availability_schedules (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID        NOT NULL
                             REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week  SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME        NOT NULL,
  end_time     TIME        NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- End must be after start
  CONSTRAINT availability_schedules_valid_window CHECK (end_time > start_time),

  -- One recurring rule per provider per weekday
  -- (A provider sets Mon 9–18, not two overlapping Monday windows)
  CONSTRAINT uq_provider_day UNIQUE (provider_id, day_of_week)
);

CREATE INDEX idx_availability_schedules_provider
  ON public.availability_schedules (provider_id);
CREATE INDEX idx_availability_schedules_active
  ON public.availability_schedules (provider_id, day_of_week)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS availability_schedules_updated_at ON public.availability_schedules;
CREATE TRIGGER availability_schedules_updated_at
  BEFORE UPDATE ON public.availability_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- Table: availability_exceptions
-- ----------------------------------------------------------------
CREATE TABLE public.availability_exceptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID        NOT NULL
                                REFERENCES public.providers(id) ON DELETE CASCADE,
  exception_date  DATE        NOT NULL,

  -- true  = provider is fully blocked that day (e.g. vacation, illness)
  -- false = provider has custom hours that day (override the weekly schedule)
  is_blocked      BOOLEAN     NOT NULL DEFAULT true,

  -- Only used when is_blocked = false (custom hours override)
  start_time      TIME,
  end_time        TIME,

  -- Internal note for the provider (e.g. "School holiday"). Not exposed publicly.
  reason          TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One exception row per provider per calendar date
  CONSTRAINT uq_provider_exception_date UNIQUE (provider_id, exception_date),

  -- Custom hours require both start_time and end_time to be set
  CONSTRAINT exceptions_custom_hours_complete CHECK (
    is_blocked = true
    OR (is_blocked = false AND start_time IS NOT NULL AND end_time IS NOT NULL)
  ),

  -- Custom hours window must be valid
  CONSTRAINT exceptions_valid_custom_window CHECK (
    is_blocked = true OR end_time > start_time
  )
);

CREATE INDEX idx_availability_exceptions_provider_date
  ON public.availability_exceptions (provider_id, exception_date);

-- ================================================================
-- rollback:
--   DROP TRIGGER IF EXISTS availability_schedules_updated_at ON public.availability_schedules;
--   DROP TABLE IF EXISTS public.availability_exceptions;
--   DROP TABLE IF EXISTS public.availability_schedules;
-- ================================================================
