-- =============================================================
-- Migration 020: Add stripe_event_id to payments
-- Project: Alvessa Marketplace
-- Purpose: Enable idempotent Stripe webhook processing.
--
-- Problem:
--   Stripe retries webhook events when the endpoint returns 5xx
--   or times out. Without tracking which events were processed,
--   a retry would re-trigger email notifications.
--
-- Solution:
--   Store the Stripe event ID (evt_...) on the payment record.
--   The UNIQUE constraint prevents a second INSERT for the same
--   event_id, and the webhook checks for its existence at the
--   start of processing to short-circuit retries before any
--   database or email operations run.
--
-- Existing rows:
--   Nullable so pre-migration rows are unaffected. All new rows
--   written by the webhook will populate this column.
-- =============================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT UNIQUE;

-- ================================================================
-- rollback:
--   ALTER TABLE public.payments DROP COLUMN IF EXISTS stripe_event_id;
-- ================================================================
