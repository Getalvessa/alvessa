-- =============================================================
-- Migration 002: Profiles and Providers
-- Project: Zenzo Marketplace
-- Purpose: Core user identity tables.
--
--   profiles  — extends auth.users for all user types (1:1)
--   providers — provider-specific profile data (1:1 with profiles)
--
-- Design decisions:
--   - Roles are boolean flags (is_customer / is_provider / is_admin),
--     not a single enum. A user can hold multiple roles simultaneously
--     (e.g. a provider who also books services as a customer).
--     See docs/ARCHITECTURE_FREEZE.md decision #10.
--   - profiles.deleted_at supports GDPR-compliant soft deletion:
--     set deleted_at + anonymize PII fields. Never hard-delete profiles.
--   - providers.slug is mandatory for SEO-friendly public URLs.
--   - providers.avg_rating / total_reviews are denormalized caches
--     updated by trigger in migration 005 after each review change.
--   - stripe_account_id is private — must never be returned to public
--     callers. Enforced at the API layer.
-- =============================================================

-- ----------------------------------------------------------------
-- Table: profiles
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT        NOT NULL CHECK (length(trim(display_name)) > 0),
  phone         TEXT,
  avatar_url    TEXT,

  -- Role flags: allow a single user to be both customer and provider
  is_customer   BOOLEAN     NOT NULL DEFAULT true,
  is_provider   BOOLEAN     NOT NULL DEFAULT false,
  is_admin      BOOLEAN     NOT NULL DEFAULT false,

  -- GDPR: soft-delete marker. When set, anonymise PII and stop
  -- returning this profile in any non-admin queries.
  deleted_at    TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_at_least_one_role
    CHECK (is_customer = true OR is_provider = true OR is_admin = true)
);

CREATE INDEX idx_profiles_is_provider ON public.profiles (is_provider) WHERE is_provider = true;
CREATE INDEX idx_profiles_is_admin    ON public.profiles (is_admin)    WHERE is_admin    = true;
CREATE INDEX idx_profiles_deleted_at  ON public.profiles (deleted_at)  WHERE deleted_at  IS NOT NULL;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- Table: providers
-- ----------------------------------------------------------------
CREATE TABLE public.providers (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                  UUID        NOT NULL UNIQUE
                                            REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- URL-safe slug for public provider profile pages (e.g. /masseurs/jan-de-vries-utrecht)
  -- Pattern: lowercase alphanumeric + hyphens, 3–64 chars
  slug                        TEXT        NOT NULL UNIQUE
                                            CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$'),

  bio                         TEXT,
  city                        TEXT        NOT NULL DEFAULT 'Utrecht',
  service_area_km             SMALLINT    NOT NULL DEFAULT 10
                                            CHECK (service_area_km BETWEEN 1 AND 100),

  -- Certifications: JSON array of { title: string, issuer: string, year: number }
  -- Stored as JSONB for flexibility; validated at application layer
  certifications              JSONB       NOT NULL DEFAULT '[]',

  -- Stripe Connect account (private — column must never be exposed publicly)
  stripe_account_id           TEXT        UNIQUE,
  stripe_onboarding_completed BOOLEAN     NOT NULL DEFAULT false,

  -- Verification state (set by admin after manual review)
  is_verified                 BOOLEAN     NOT NULL DEFAULT false,
  is_active                   BOOLEAN     NOT NULL DEFAULT true,

  -- Denormalised review statistics; updated by trigger after each review write
  -- NULL until the first review is published
  avg_rating                  NUMERIC(3,2) CHECK (avg_rating BETWEEN 1.00 AND 5.00),
  total_reviews               INTEGER     NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_providers_profile_id       ON public.providers (profile_id);
CREATE INDEX idx_providers_city_active      ON public.providers (city, is_active, is_verified);
CREATE INDEX idx_providers_slug             ON public.providers (slug);
CREATE INDEX idx_providers_active_verified  ON public.providers (is_active, is_verified)
  WHERE is_active = true AND is_verified = true;

DROP TRIGGER IF EXISTS providers_updated_at ON public.providers;
CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- Auth hook: create a profiles row when a new user signs up
-- ================================================================
-- This trigger fires on auth.users INSERT (handled by Supabase Auth).
-- SECURITY DEFINER lets it bypass RLS to write the first profile row.
-- SET search_path = public prevents search_path injection attacks.
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
      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      split_part(NEW.email, '@', 1)
    ),
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- RLS helper functions
-- Defined here because they query profiles and providers tables.
-- SECURITY DEFINER bypasses RLS so they can safely read those tables
-- when called from within RLS policy USING/WITH CHECK expressions.
-- STABLE tells PostgreSQL the result is constant within a SQL statement
-- (safe to cache per-query, not per-row).
-- ================================================================

-- Returns true when the current authenticated user has is_admin = true
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.profiles
    WHERE  id         = (SELECT auth.uid())
      AND  is_admin   = true
      AND  deleted_at IS NULL
  );
$$;

-- Returns the providers.id that belongs to the current authenticated user,
-- or NULL if the user has no provider profile.
CREATE OR REPLACE FUNCTION public.get_my_provider_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM   public.providers
  WHERE  profile_id = (SELECT auth.uid());
$$;

-- ================================================================
-- rollback:
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();
--   DROP FUNCTION IF EXISTS public.get_my_provider_id();
--   DROP FUNCTION IF EXISTS public.is_admin();
--   DROP TRIGGER IF EXISTS providers_updated_at ON public.providers;
--   DROP TRIGGER IF EXISTS profiles_updated_at  ON public.profiles;
--   DROP TABLE IF EXISTS public.providers;
--   DROP TABLE IF EXISTS public.profiles;
-- ================================================================
