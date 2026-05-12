-- =============================================================
-- Migration 001: Extensions and Shared Helpers
-- Project: Zenzo Marketplace
-- Purpose: Enable required PostgreSQL extensions and define
--          the shared trigger function used by all tables with
--          an updated_at column.
-- =============================================================

-- btree_gist: required for the bookings overlap exclusion constraint
-- (provider_id WITH = combined with tstzrange WITH &&)
-- See migration 005, CONSTRAINT no_overlapping_confirmed_bookings
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =============================================================
-- Shared trigger function: keep updated_at in sync automatically
-- Attach to any table via:
--   CREATE TRIGGER <table>_updated_at
--   BEFORE UPDATE ON public.<table>
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================
-- rollback:
--   DROP FUNCTION IF EXISTS public.update_updated_at_column();
--   DROP EXTENSION IF EXISTS btree_gist;
-- =============================================================
