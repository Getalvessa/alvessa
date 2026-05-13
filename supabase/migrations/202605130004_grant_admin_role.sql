-- =============================================================
-- Migration 012: Grant admin role to project owner
-- Project: Zenzo Marketplace
-- Purpose: Set is_admin = true for the project owner account so
--          the admin dashboard (/admin) is accessible.
--
-- The profile row is created by the handle_new_user trigger on
-- first sign-in. This migration sets the flag after the fact.
-- =============================================================

UPDATE public.profiles
SET    is_admin = true
WHERE  id = '0b461ebc-d48b-487f-a16d-cdb7024057fd';

-- ================================================================
-- rollback:
--   UPDATE public.profiles SET is_admin = false
--   WHERE id = '0b461ebc-d48b-487f-a16d-cdb7024057fd';
-- ================================================================
