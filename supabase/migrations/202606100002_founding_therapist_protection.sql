-- =============================================================
-- Migration 024: Protect Founding Therapist fields
-- Project: Alvessa Marketplace
-- Purpose: Bring is_founding_therapist / founding_joined_at (added in
--          202606050001_founding_therapist.sql) under the same admin-only
--          write protection as the trust-network fields.
--
-- Problem:
--   The providers UPDATE policy ("providers: owner can update own") lets a
--   provider update their own row. The prevent_provider_integrity_fields()
--   trigger blocks is_verified / avg_rating / stripe_* / status / trust_level /
--   internal_* / referred_by_provider_id, but NOT the two founding columns.
--   A provider could therefore PATCH the Supabase REST API to grant themselves
--   the Founding Therapist badge and priority placement.
--
-- Fix:
--   CREATE OR REPLACE prevent_provider_integrity_fields() — identical to the
--   migration 016 version, with two added guards for the founding columns.
--   Bypass conditions are preserved exactly:
--     Bypass 1: app.system_update = 'true'  → rating stats system trigger
--     Bypass 2: auth.uid() IS NULL          → service_role / no-JWT context
--   Admin updates remain allowed (is_admin check). The admin server action
--   toggleFoundingTherapistAction uses service_role, so it is unaffected.
--
-- Blast radius: providers BEFORE UPDATE trigger function only.
--   No schema, policy, or data changes.
-- =============================================================

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

    -- ── Trust network fields (from migration 016) ───────────────────

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

    -- ── Founding Therapist fields (new in migration 024) ────────────

    IF NEW.is_founding_therapist != OLD.is_founding_therapist THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change Founding Therapist status';
    END IF;

    IF NEW.founding_joined_at IS DISTINCT FROM OLD.founding_joined_at THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change the Founding Therapist join date';
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
--   Re-apply the migration 016 version of prevent_provider_integrity_fields()
--   (copy the function body from 202605270003_provider_trust_network.sql),
--   then:
--     DROP TRIGGER IF EXISTS providers_protect_integrity_fields ON public.providers;
--     CREATE TRIGGER providers_protect_integrity_fields
--       BEFORE UPDATE ON public.providers
--       FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_integrity_fields();
-- ================================================================
