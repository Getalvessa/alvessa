-- Migration 018: admin_audit_log
-- Creates a minimal append-only audit log for sensitive admin operations.
-- Writes happen from server actions via the user-scoped client (admin authenticated).
-- RLS is the actual security boundary — see INSERT policy below.
-- No UPDATE or DELETE policies — records are immutable.
--
-- actor_user_id is nullable: if the admin account is deleted, the audit record is
-- preserved with actor_user_id = NULL rather than blocking the auth.users DELETE.
-- (NOT NULL + ON DELETE SET NULL is a PostgreSQL constraint conflict — avoid it.)
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.admin_audit_log;

-- ============================================================
-- Table
-- ============================================================

CREATE TABLE public.admin_audit_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type   TEXT        NOT NULL, -- 'provider' | 'booking' | 'user'
  target_id     UUID,                 -- ID of the affected row (provider_id / booking_id / user_id)
  action        TEXT        NOT NULL, -- e.g. 'provider.approve', 'booking.cancel'
  metadata      JSONB,                -- optional context (old values, reason, etc.)
  created_at    TIMESTAMPTZ NOT NULL  DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

-- Time-ordered view (primary admin dashboard query)
CREATE INDEX admin_audit_log_created_at_idx
  ON public.admin_audit_log (created_at DESC);

-- Filter by who performed the action
CREATE INDEX admin_audit_log_actor_idx
  ON public.admin_audit_log (actor_user_id);

-- Filter by what entity was affected
CREATE INDEX admin_audit_log_target_idx
  ON public.admin_audit_log (target_type, target_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins may read
CREATE POLICY "admin_audit_log_select_admin_only"
  ON public.admin_audit_log
  FOR SELECT
  USING (public.is_admin());

-- RLS is the actual INSERT security boundary, not the server action pattern.
-- An admin with a direct Supabase session can technically INSERT, but:
--   (1) is_admin() must be true — blocks all non-admins
--   (2) actor_user_id must equal auth.uid() — prevents impersonating another admin
-- Server actions are the intended write path; RLS is the enforcement layer.
CREATE POLICY "admin_audit_log_insert_admin_only"
  ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (
    auth.uid() = actor_user_id
    AND public.is_admin()
  );

-- No UPDATE or DELETE policies — audit log is append-only.
