-- =============================================================
-- Migration 017: Bookings — Reassignment Tracking (Architecture Placeholder)
-- Project: Alvessa Marketplace
-- Purpose: Adds reassigned_from_provider_id to the bookings table.
--
-- This field records the original provider when an admin manually
-- transfers a booking to a different provider (e.g. A is unavailable,
-- admin reassigns to B). No automated reassignment logic is implemented
-- in this migration — that is a Phase 8+ feature.
--
-- Current use: admin updates this field manually (e.g. via Supabase Studio
-- or a future admin action). The field is nullable; NULL means the booking
-- was never reassigned.
--
-- ON DELETE SET NULL: if the original provider is deactivated/removed,
-- the audit trail field is cleared rather than blocking the deletion.
--
-- Blast radius: bookings table schema only. No policy, trigger, or
-- application code changes.
-- Rollback: ALTER TABLE public.bookings DROP COLUMN IF EXISTS reassigned_from_provider_id;
-- =============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reassigned_from_provider_id UUID
    CONSTRAINT bookings_reassigned_from_fkey
    REFERENCES public.providers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_reassigned_from
  ON public.bookings (reassigned_from_provider_id)
  WHERE reassigned_from_provider_id IS NOT NULL;
