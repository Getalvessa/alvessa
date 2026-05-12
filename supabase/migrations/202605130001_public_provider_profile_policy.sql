-- =============================================================
-- Migration 009: Public read policy for provider profiles
-- Project: Zenzo Marketplace
-- Purpose: Allow anonymous and authenticated users to read the
--          display_name and avatar_url of profiles that belong to
--          active + verified providers (public marketplace data).
--
-- Problem: Migration 006 only allowed profile owners and admins
--          to read profiles. The public provider listing and
--          profile pages join providers → profiles to show the
--          therapist's name and avatar. Without a public read
--          policy, PostgREST filters out the profiles rows for
--          anonymous users, causing the provider name to fall back
--          to the slug.
--
-- Security note: PostgreSQL RLS is row-level; it cannot restrict
--          individual columns. Sensitive fields (phone, deleted_at)
--          are protected by the API layer — server queries must
--          only SELECT (display_name, avatar_url) for public use,
--          which is enforced in lib/supabase queries.
-- =============================================================

-- Allow public (anon) visitors to read provider profile rows
-- Only for profiles linked to active + verified providers
CREATE POLICY "profiles: anon reads active provider profiles"
  ON public.profiles FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE  p.profile_id = profiles.id
        AND  p.is_active   = true
        AND  p.is_verified = true
    )
  );

-- Same for authenticated users browsing the marketplace
CREATE POLICY "profiles: authenticated reads active provider profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE  p.profile_id = profiles.id
        AND  p.is_active   = true
        AND  p.is_verified = true
    )
  );

-- ================================================================
-- rollback:
--   DROP POLICY IF EXISTS "profiles: anon reads active provider profiles"
--     ON public.profiles;
--   DROP POLICY IF EXISTS "profiles: authenticated reads active provider profiles"
--     ON public.profiles;
-- ================================================================
