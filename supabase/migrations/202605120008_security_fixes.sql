-- =============================================================
-- Migration 008: Security Fixes
-- Project: Zenzo Marketplace
-- Purpose: Remediate vulnerabilities found in Phase 2B-3 static
--          SQL review. This migration is APPEND-ONLY — it does not
--          alter files 001–007, only adds/replaces functions,
--          triggers, and policies on top of the existing schema.
--
-- Fixes applied:
--   [HIGH]   Fix 1 — profiles privilege escalation
--            A non-admin could SET is_admin = true on their own
--            profile, bypassing admin-only access controls.
--
--   [MEDIUM] Fix 2 — providers INSERT self-verification
--            A user could INSERT a providers row with
--            is_verified = true, avg_rating = 5.0, bypassing
--            the admin approval workflow.
--
--   [MEDIUM] Fix 3 — providers UPDATE integrity field protection
--            A provider could UPDATE is_verified, avg_rating,
--            total_reviews, stripe_account_id directly.
--            Note: update_provider_rating_stats (migration 005)
--            also writes avg_rating/total_reviews; this migration
--            re-defines that function to use a session-level signal
--            (app.system_update) so the new trigger can distinguish
--            trusted system writes from user-initiated writes.
--
--   [MEDIUM] Fix 4 — reviews INSERT provider_id spoofing
--            A customer could submit a review pointing
--            reviews.provider_id to a different provider than
--            the one who performed the service.
--
--   [LOW]    Fix 5 — handle_new_user NULL email resilience
--            Phone-only signup (no email) caused a NOT NULL
--            constraint failure on profiles.display_name.
-- =============================================================

-- ================================================================
-- FIX 1: profiles — prevent privilege escalation
-- ================================================================
-- Trigger: fires BEFORE UPDATE on profiles.
-- Blocks non-admin users from modifying role flags
-- (is_admin, is_provider, is_customer) on any profile row.
-- Allows service_role calls (auth.uid() IS NULL = no JWT) and
-- admin-initiated changes unconditionally.
-- ================================================================

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role and system calls carry no JWT → auth.uid() is NULL.
  -- These are trusted server-side operations; allow unconditionally.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check whether any role flag is being changed
  IF NEW.is_admin    != OLD.is_admin
     OR NEW.is_provider != OLD.is_provider
     OR NEW.is_customer != OLD.is_customer
  THEN
    -- Only current admins may change role flags on any profile
    IF NOT (
      SELECT is_admin
      FROM   public.profiles
      WHERE  id         = auth.uid()
        AND  deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Role flags (is_admin, is_provider, is_customer) '
                     'can only be modified by an administrator';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger (replaces any pre-existing version of the same name)
DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ================================================================
-- FIX 2: providers INSERT — prevent self-verification
-- ================================================================
-- Replaces the policy from migration 006 with a stricter version.
-- WITH CHECK now enforces that system-controlled fields must hold
-- their default values at INSERT time; users cannot override them.
--
-- Fields enforced:
--   is_verified             = false   (admin must approve)
--   avg_rating              IS NULL   (maintained by review trigger)
--   total_reviews           = 0       (maintained by review trigger)
--   stripe_account_id       IS NULL   (set by payment integration)
--   stripe_onboarding_completed = false (set by payment integration)
-- ================================================================

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
  );

-- ================================================================
-- FIX 3a: update_provider_rating_stats — add system update signal
-- ================================================================
-- Re-defines the function originally created in migration 005.
-- Before updating avg_rating / total_reviews on providers, the
-- function sets the session-local config key 'app.system_update'
-- to 'true'. The new providers integrity trigger (Fix 3b) reads
-- this key and skips its field-protection checks, allowing the
-- trusted system write to proceed.
--
-- set_config(..., true) is transaction-local: it resets
-- automatically at transaction end or on rollback, so it cannot
-- "leak" across requests.
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_provider_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id   UUID;
  v_avg_rating    NUMERIC(3,2);
  v_total_reviews INTEGER;
BEGIN
  v_provider_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.provider_id
    ELSE                       NEW.provider_id
  END;

  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)::INTEGER
  INTO v_avg_rating, v_total_reviews
  FROM  public.reviews
  WHERE provider_id  = v_provider_id
    AND is_published = true;

  -- Signal that the following UPDATE is a trusted system operation.
  -- The providers integrity trigger (Fix 3b) skips its checks when
  -- this key is 'true'. The third argument (true) makes the setting
  -- local to the current transaction, preventing cross-request leakage.
  PERFORM set_config('app.system_update', 'true', true);

  UPDATE public.providers
  SET
    avg_rating    = v_avg_rating,          -- NULL when no published reviews remain
    total_reviews = COALESCE(v_total_reviews, 0),
    updated_at    = NOW()
  WHERE id = v_provider_id;

  -- Reset the signal immediately after the write completes
  PERFORM set_config('app.system_update', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ================================================================
-- FIX 3b: providers — protect system-controlled integrity fields
-- ================================================================
-- Trigger: fires BEFORE UPDATE on providers.
-- Guards the following columns against user manipulation:
--   is_verified             — set only by admins after manual review
--   avg_rating              — maintained by update_provider_rating_stats
--   total_reviews           — maintained by update_provider_rating_stats
--   stripe_account_id       — set only by the Stripe integration
--   stripe_onboarding_completed — set only by the Stripe integration
--
-- Bypass conditions (allowed without admin check):
--   1. app.system_update = 'true'  → trusted system trigger (Fix 3a)
--   2. auth.uid() IS NULL          → service_role / no JWT context
--                                    (e.g. Stripe webhook handler)
-- ================================================================

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
  -- (e.g. Stripe webhook setting stripe_account_id via service_role key)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- For authenticated users: only admins may change system fields
  IF NOT (
    SELECT is_admin
    FROM   public.profiles
    WHERE  id         = auth.uid()
      AND  deleted_at IS NULL
  ) THEN
    -- is_verified: admin approval gate
    IF NEW.is_verified != OLD.is_verified THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'Only administrators can change provider verification status';
    END IF;

    -- avg_rating: maintained exclusively by review trigger
    IF NEW.avg_rating IS DISTINCT FROM OLD.avg_rating THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'avg_rating is calculated by the review system and cannot be set manually';
    END IF;

    -- total_reviews: maintained exclusively by review trigger
    IF NEW.total_reviews != OLD.total_reviews THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'total_reviews is calculated by the review system and cannot be set manually';
    END IF;

    -- stripe_account_id: managed by Stripe Connect integration
    IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'stripe_account_id is managed by the payment integration';
    END IF;

    -- stripe_onboarding_completed: managed by Stripe Connect integration
    IF NEW.stripe_onboarding_completed != OLD.stripe_onboarding_completed THEN
      RAISE EXCEPTION 'permission_denied'
        USING HINT = 'stripe_onboarding_completed is managed by the payment integration';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS providers_protect_integrity_fields ON public.providers;
CREATE TRIGGER providers_protect_integrity_fields
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_integrity_fields();

-- ================================================================
-- FIX 4: reviews INSERT — validate provider_id against booking
-- ================================================================
-- Replaces the policy from migration 006.
-- The original policy verified that the booking belonged to the
-- customer and had status = completed, but did NOT verify that
-- reviews.provider_id matched bookings.provider_id.
-- A customer could have attributed a review to a different provider,
-- corrupting that provider's avg_rating via the review trigger.
--
-- The fix adds: AND b.provider_id = reviews.provider_id
-- ================================================================

DROP POLICY IF EXISTS "reviews: customers insert for completed bookings"
  ON public.reviews;

CREATE POLICY "reviews: customers insert for completed bookings"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE  b.id          = reviews.booking_id
        AND  b.customer_id = (SELECT auth.uid())
        AND  b.status      = 'completed'
        AND  b.provider_id = reviews.provider_id  -- must match the booking's provider
    )
  );

-- ================================================================
-- FIX 5: handle_new_user — NULL email resilience
-- ================================================================
-- Re-defines the function originally created in migration 002.
-- The original split_part(NEW.email, '@', 1) fails with a NOT NULL
-- violation when NEW.email is NULL (e.g. phone-only signup).
-- The updated version adds a final fallback: "User-" + first 8 chars
-- of the user's UUID.
--
-- Display name resolution order:
--   1. raw_user_meta_data.full_name (Google OAuth, etc.)
--   2. local-part of email address  (standard email signup)
--   3. "User-" + uuid[:8]           (phone-only or other OAuth)
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, is_customer)
  VALUES (
    NEW.id,
    COALESCE(
      -- 1. Full name from OAuth provider metadata
      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      -- 2. Local-part of email address (guard against NULL email)
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      -- 3. Stable fallback: avoids empty display_name NOT NULL violation
      'User-' || substr(NEW.id::text, 1, 8)
    ),
    true
  );
  RETURN NEW;
END;
$$;

-- The trigger on_auth_user_created (created in migration 002) still
-- points to this function; no trigger DDL change is needed since
-- CREATE OR REPLACE updates the function body in place.

-- ================================================================
-- rollback:
--
-- -- Remove Fix 1 trigger and function:
-- DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
-- DROP FUNCTION IF EXISTS public.prevent_profile_privilege_escalation();
--
-- -- Restore Fix 2 policy (revert to migration 006 version):
-- DROP POLICY IF EXISTS "providers: owner can insert" ON public.providers;
-- CREATE POLICY "providers: owner can insert"
--   ON public.providers FOR INSERT TO authenticated
--   WITH CHECK (profile_id = (SELECT auth.uid()));
--
-- -- Remove Fix 3b trigger and function:
-- DROP TRIGGER IF EXISTS providers_protect_integrity_fields ON public.providers;
-- DROP FUNCTION IF EXISTS public.prevent_provider_integrity_fields();
--
-- -- Restore Fix 3a function (revert to migration 005 version without signal):
-- CREATE OR REPLACE FUNCTION public.update_provider_rating_stats()
-- RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- DECLARE
--   v_provider_id   UUID;
--   v_avg_rating    NUMERIC(3,2);
--   v_total_reviews INTEGER;
-- BEGIN
--   v_provider_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.provider_id ELSE NEW.provider_id END;
--   SELECT ROUND(AVG(rating)::NUMERIC, 2), COUNT(*)::INTEGER
--   INTO v_avg_rating, v_total_reviews
--   FROM public.reviews WHERE provider_id = v_provider_id AND is_published = true;
--   UPDATE public.providers
--   SET avg_rating = v_avg_rating, total_reviews = COALESCE(v_total_reviews, 0), updated_at = NOW()
--   WHERE id = v_provider_id;
--   RETURN COALESCE(NEW, OLD);
-- END;
-- $$;
--
-- -- Restore Fix 4 policy (revert to migration 006 version):
-- DROP POLICY IF EXISTS "reviews: customers insert for completed bookings" ON public.reviews;
-- CREATE POLICY "reviews: customers insert for completed bookings"
--   ON public.reviews FOR INSERT TO authenticated
--   WITH CHECK (
--     customer_id = (SELECT auth.uid())
--     AND EXISTS (
--       SELECT 1 FROM public.bookings b
--       WHERE b.id = reviews.booking_id
--         AND b.customer_id = (SELECT auth.uid())
--         AND b.status = 'completed'
--     )
--   );
--
-- -- Fix 5 (handle_new_user) has no separate rollback; re-apply migration 002
-- -- function body using CREATE OR REPLACE if needed.
-- ================================================================
