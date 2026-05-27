-- =============================================================
-- Migration 016: Provider Trust Network
-- Project: Alvessa Marketplace
-- Purpose: Add quality-governance fields to the providers table.
--
--   status                  — lifecycle state (new → trusted → core | restricted | banned)
--   trust_level             — admin-assigned score 0–100
--   referred_by_provider_id — who referred this provider (self-reference, nullable)
--   internal_score          — admin-internal numeric signal (not exposed to frontend)
--   internal_notes          — admin operations notes (not exposed to frontend)
--
-- Security:
--   All five new fields are admin-only write targets.
--   The existing prevent_provider_integrity_fields trigger (migration 008)
--   is extended via CREATE OR REPLACE to also protect the new fields.
--   The "providers: owner can insert" policy is updated to enforce
--   default values at INSERT time (providers cannot self-assign trust status).
--
-- API layer responsibility:
--   internal_score and internal_notes must NEVER be included in provider-facing
--   SELECT queries. Follow the same pattern as stripe_account_id.
--
-- Blast radius: providers table + INSERT policy + BEFORE UPDATE trigger.
-- Rollback: see rollback block at end.
-- =============================================================

-- ----------------------------------------------------------------
-- 1. Add new columns to providers
-- ----------------------------------------------------------------

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
    CONSTRAINT providers_status_check
    CHECK (status IN ('new', 'trusted', 'core', 'restricted', 'banned')),

  ADD COLUMN IF NOT EXISTS trust_level SMALLINT NOT NULL DEFAULT 0
    CONSTRAINT providers_trust_level_check
    CHECK (trust_level BETWEEN 0 AND 100),

  -- Self-reference: nullable, ON DELETE SET NULL so deleting a referring
  -- provider does not cascade to the referred provider's record.
  ADD COLUMN IF NOT EXISTS referred_by_provider_id UUID
    CONSTRAINT providers_referred_by_fkey
    REFERENCES public.providers(id) ON DELETE SET NULL,

  -- Admin-internal scoring signal. Not exposed via any provider-facing API.
  ADD COLUMN IF NOT EXISTS internal_score INTEGER NOT NULL DEFAULT 0,

  -- Admin operations notes. Not exposed via any provider-facing API.
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- ----------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_providers_status
  ON public.providers (status);

CREATE INDEX IF NOT EXISTS idx_providers_referred_by
  ON public.providers (referred_by_provider_id)
  WHERE referred_by_provider_id IS NOT NULL;

-- ----------------------------------------------------------------
-- 3. Update INSERT policy to enforce defaults for new fields
-- ----------------------------------------------------------------
-- Replaces the version from migration 008. Adds five new WITH CHECK
-- conditions so providers cannot self-assign trust fields at sign-up time.

DROP POLICY IF EXISTS "providers: owner can insert" ON public.providers;

CREATE POLICY "providers: owner can insert"
  ON public.providers FOR INSERT TO authenticated
  WITH CHECK (
    profile_id                      = (SELECT auth.uid())
    AND is_verified                 = false
    AND avg_rating                  IS NULL
    AND total_reviews               = 0
    AND stripe_account_id           IS NULL
    AND stripe_onboarding_completed = false
    -- Trust network defaults: providers cannot self-assign on sign-up
    AND status                      = 'new'
    AND trust_level                 = 0
    AND internal_score              = 0
    AND internal_notes              IS NULL
    AND referred_by_provider_id     IS NULL
  );

-- ----------------------------------------------------------------
-- 4. Extend integrity trigger to protect new admin-only fields
-- ----------------------------------------------------------------
-- Re-defines prevent_provider_integrity_fields from migration 008.
-- Bypass conditions are preserved exactly:
--   Bypass 1: app.system_update = 'true'  → rating stats system trigger
--   Bypass 2: auth.uid() IS NULL          → service_role / no-JWT context
-- The new section guards: status, trust_level, internal_score,
-- internal_notes, referred_by_provider_id.

CREATE OR REPLACE FUNCTION public.prevent_provider_integrity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass 1: trusted system write from update_provider_rating_stats
  IF current_setting('app.system_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Bypass 2: service_role or other server-side calls with no JWT
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- For authenticated users: only admins may change protected fields
  IF NOT (
    SELECT is_admin
    FROM   public.profiles
    WHERE  id         = auth.uid()
      AND  deleted_at IS NULL
  ) THEN

    -- ── Legacy integrity fields (from migration 008) ────────────────

    IF NEW.is_verified != OLD.is_verified THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change provider verification status';
    END IF;

    IF NEW.avg_rating IS DISTINCT FROM OLD.avg_rating THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'avg_rating is maintained by the review system and cannot be set manually';
    END IF;

    IF NEW.total_reviews != OLD.total_reviews THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'total_reviews is maintained by the review system and cannot be set manually';
    END IF;

    IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'stripe_account_id is managed by the payment integration';
    END IF;

    IF NEW.stripe_onboarding_completed != OLD.stripe_onboarding_completed THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'stripe_onboarding_completed is managed by the payment integration';
    END IF;

    -- ── Trust network fields (new in migration 016) ─────────────────

    IF NEW.status != OLD.status THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change provider status';
    END IF;

    IF NEW.trust_level != OLD.trust_level THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change provider trust level';
    END IF;

    IF NEW.internal_score != OLD.internal_score THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change provider internal score';
    END IF;

    IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change provider internal notes';
    END IF;

    IF NEW.referred_by_provider_id IS DISTINCT FROM OLD.referred_by_provider_id THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change referral relationships';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS providers_protect_integrity_fields ON public.providers;
CREATE TRIGGER providers_protect_integrity_fields
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_integrity_fields();

-- ================================================================
-- rollback:
--
-- -- Remove new columns:
-- ALTER TABLE public.providers
--   DROP COLUMN IF EXISTS status,
--   DROP COLUMN IF EXISTS trust_level,
--   DROP COLUMN IF EXISTS referred_by_provider_id,
--   DROP COLUMN IF EXISTS internal_score,
--   DROP COLUMN IF EXISTS internal_notes;
--
-- -- Restore INSERT policy (migration 008 version):
-- DROP POLICY IF EXISTS "providers: owner can insert" ON public.providers;
-- CREATE POLICY "providers: owner can insert"
--   ON public.providers FOR INSERT TO authenticated
--   WITH CHECK (
--     profile_id = (SELECT auth.uid())
--     AND is_verified = false
--     AND avg_rating IS NULL
--     AND total_reviews = 0
--     AND stripe_account_id IS NULL
--     AND stripe_onboarding_completed = false
--   );
--
-- -- Restore integrity trigger function (migration 008 version):
-- --   (Copy the function body from 202605120008_security_fixes.sql)
-- ================================================================
