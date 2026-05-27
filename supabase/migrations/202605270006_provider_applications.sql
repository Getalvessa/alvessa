-- Migration 019: provider_applications
-- Minimal anonymous intake table for provider onboarding.
-- No auth required to submit (anon INSERT allowed via RLS).
-- Admin-only SELECT. No UPDATE/DELETE policies — admin manages via Dashboard.
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.provider_applications;

CREATE TABLE public.provider_applications (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name            TEXT        NOT NULL,
  email                TEXT        NOT NULL,
  phone                TEXT        NOT NULL,
  city                 TEXT        NOT NULL DEFAULT 'Utrecht',
  service_types        TEXT        NOT NULL,
  works_mobile         BOOLEAN     NOT NULL DEFAULT true,
  service_area         TEXT,
  experience_years     INTEGER     CHECK (experience_years >= 0 AND experience_years <= 80),
  instagram_or_website TEXT,
  message              TEXT,
  status               TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ordered by status + date for admin review queue
CREATE INDEX provider_applications_status_created_idx
  ON public.provider_applications (status, created_at DESC);

ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) may submit — status must be 'pending'
-- Prevents submitting pre-approved or rejected records
CREATE POLICY "provider_applications_insert_public"
  ON public.provider_applications
  FOR INSERT
  WITH CHECK (status = 'pending');

-- Only admins can read applications
CREATE POLICY "provider_applications_select_admin"
  ON public.provider_applications
  FOR SELECT
  USING (public.is_admin());
