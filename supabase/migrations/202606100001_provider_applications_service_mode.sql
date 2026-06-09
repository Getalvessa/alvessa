-- Migration 020 — Phase 1 (Expand): add service_mode to provider_applications
--
-- Pattern: expand/contract.
-- Phase 1 (this file): add nullable service_mode, backfill, keep works_mobile.
-- Phase 2 (future, separate migration): SET NOT NULL, SET DEFAULT, DROP works_mobile.
--
-- service_mode is intentionally left nullable so that rows written by old
-- application code during the deploy window (before the new code goes live)
-- remain valid — they have works_mobile set and service_mode = NULL.
-- The application layer falls back to works_mobile when service_mode IS NULL.
--
-- ROLLBACK (undo this migration only):
--   ALTER TABLE public.provider_applications DROP COLUMN IF EXISTS service_mode;

-- Step 1: add the new column as nullable with only a CHECK constraint.
--   No NOT NULL. No DEFAULT. Both are intentional — see comment above.
ALTER TABLE public.provider_applications
  ADD COLUMN IF NOT EXISTS service_mode TEXT
    CHECK (service_mode IN ('studio_only', 'mobile_only', 'hybrid'));

-- Step 2: backfill all rows that exist at migration time.
--   works_mobile = true  → mobile_only
--   works_mobile = false → studio_only
--   works_mobile IS NULL → studio_only (works_mobile was NOT NULL DEFAULT true,
--                          so this branch should never fire in practice)
UPDATE public.provider_applications
  SET service_mode = CASE
    WHEN works_mobile = true THEN 'mobile_only'
    ELSE 'studio_only'
  END
  WHERE service_mode IS NULL;

-- works_mobile is intentionally kept.
-- Phase 2 will set NOT NULL, DEFAULT, and drop works_mobile once stable.
