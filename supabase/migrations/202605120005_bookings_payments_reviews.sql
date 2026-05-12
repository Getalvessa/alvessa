-- =============================================================
-- Migration 005: Bookings, Payments, and Reviews
-- Project: Zenzo Marketplace
-- Purpose: Core transaction tables.
--
--   bookings  — central booking record (permanent financial record)
--   payments  — Stripe payment mirror, 1:1 with bookings
--   reviews   — post-service customer reviews
--
-- Design decisions (see also docs/ARCHITECTURE_FREEZE.md):
--
--   SNAPSHOT FIELDS (#9): bookings carries copies of service name,
--   price, duration, provider name and slug at booking time. Source
--   records (services, providers) may change; historical bookings must
--   always render correctly without joining to current data.
--
--   EXCLUSION CONSTRAINT: prevents overlapping CONFIRMED bookings for
--   the same provider using a GiST range index on tstzrange.
--   Only rows with status = 'confirmed' participate. Pending and
--   cancelled rows are excluded to avoid ghost-reservation problems.
--   Requires btree_gist extension (migration 001).
--
--   GENERATED COLUMNS:
--   - bookings.end_at             = scheduled_at + duration
--   - bookings.provider_earnings_cents = total_cents - platform_fee_cents
--   Both are STORED (physically written to disk) so they can be
--   used in indexes and the exclusion constraint.
--
--   ADDRESS CLEARING TRIGGER (GDPR): when a booking reaches a
--   terminal status (cancelled / payment_failed / refunded), a
--   BEFORE UPDATE trigger immediately nulls address_line, address_lat,
--   address_lng, and address_notes. address_city is NOT cleared
--   (non-identifying; needed for analytics). The booking row itself
--   is permanently retained for audit purposes.
--   See docs/ARCHITECTURE_FREEZE.md decision #8.
--
--   BOOKINGS AND PAYMENTS ARE NEVER DELETED.
--
--   PAYMENTS: one payment row per booking (UNIQUE constraint). A failed
--   payment does not create a second row — the status column is updated.
--   If a customer retries after payment_failed, a new booking is created.
-- =============================================================

-- ----------------------------------------------------------------
-- Table: bookings
-- ----------------------------------------------------------------
CREATE TABLE public.bookings (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants (FK to profiles, not to a separate customers table)
  customer_id                     UUID        NOT NULL
                                                REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider_id                     UUID        NOT NULL
                                                REFERENCES public.providers(id) ON DELETE RESTRICT,
  provider_service_id             UUID        NOT NULL
                                                REFERENCES public.provider_services(id) ON DELETE RESTRICT,

  -- ── Status machine ──────────────────────────────────────────
  -- Transitions enforced at application layer; RLS restricts who may
  -- write each transition. See docs/DEVELOPMENT_ROADMAP.md Phase 4.
  --
  -- pending_payment → confirmed      (Stripe webhook: payment succeeded)
  -- pending_payment → payment_failed (Stripe webhook: payment failed)
  -- confirmed       → completed      (admin / scheduled task after service time)
  -- confirmed       → cancelled      (customer or provider cancels)
  -- completed       → refunded       (admin triggers full/partial refund)
  -- cancelled       → refunded       (admin triggers refund if payment was taken)
  status                          TEXT        NOT NULL DEFAULT 'pending_payment'
                                                CHECK (status IN (
                                                  'pending_payment',
                                                  'confirmed',
                                                  'completed',
                                                  'payment_failed',
                                                  'cancelled',
                                                  'refunded'
                                                )),

  -- ── Schedule ────────────────────────────────────────────────
  scheduled_at                    TIMESTAMPTZ NOT NULL,
  -- Snapshot: stored because the source service may change duration later
  duration_minutes                SMALLINT    NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  -- Computed end time; maintained by trigger bookings_set_end_at (BEFORE INSERT OR UPDATE).
  -- Cannot use GENERATED ALWAYS AS because timestamptz + interval is STABLE (not IMMUTABLE)
  -- in PostgreSQL due to DST-awareness, and STORED generated columns require IMMUTABLE.
  -- A trigger has no such restriction and achieves identical semantics.
  end_at                          TIMESTAMPTZ NOT NULL,

  -- ── Snapshot fields ─────────────────────────────────────────
  -- Copied at booking creation; must never be updated after write.
  -- These allow booking history to render correctly even if the
  -- source provider/service records are later modified or deleted.
  service_name_nl_snapshot        TEXT        NOT NULL
                                                CHECK (length(trim(service_name_nl_snapshot)) > 0),
  service_name_en_snapshot        TEXT        NOT NULL
                                                CHECK (length(trim(service_name_en_snapshot)) > 0),
  service_price_cents_snapshot    INTEGER     NOT NULL
                                                CHECK (service_price_cents_snapshot > 0),
  provider_display_name_snapshot  TEXT        NOT NULL
                                                CHECK (length(trim(provider_display_name_snapshot)) > 0),
  provider_slug_snapshot          TEXT        NOT NULL
                                                CHECK (length(trim(provider_slug_snapshot)) > 0),
  -- ── End snapshot fields ──────────────────────────────────────

  -- ── Address (privacy-sensitive) ──────────────────────────────
  -- NULLABLE: cleared by trigger when booking reaches terminal status.
  -- Provider visibility controlled at API layer:
  --   confirmed/completed → provider may see address
  --   pending/cancelled/failed/refunded → provider must NOT see address
  address_line                    TEXT,
  address_city                    TEXT        NOT NULL DEFAULT 'Utrecht',
  address_lat                     NUMERIC(10,7),
  address_lng                     NUMERIC(10,7),
  address_notes                   TEXT,   -- door codes, floor numbers — most sensitive

  -- ── Financials (snapshot at booking creation) ────────────────
  total_cents                     INTEGER     NOT NULL CHECK (total_cents > 0),
  platform_fee_cents              INTEGER     NOT NULL DEFAULT 0
                                                CHECK (platform_fee_cents >= 0),
  -- Derived: always = total_cents - platform_fee_cents
  provider_earnings_cents         INTEGER     GENERATED ALWAYS AS (
                                    total_cents - platform_fee_cents
                                  ) STORED,

  CONSTRAINT positive_provider_earnings
    CHECK (total_cents >= platform_fee_cents),

  -- ── Cancellation ────────────────────────────────────────────
  cancellation_reason             TEXT,
  cancelled_by                    TEXT        CHECK (cancelled_by IN ('customer', 'provider', 'admin')),
  cancelled_at                    TIMESTAMPTZ,

  -- ── Customer notes ──────────────────────────────────────────
  customer_notes                  TEXT,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── Exclusion constraint ─────────────────────────────────────
  -- Among rows with status = 'confirmed', no two may share the same
  -- provider_id and overlapping time range [scheduled_at, end_at).
  -- Uses '[)' half-open interval: a booking ending at 11:00 does not
  -- conflict with one starting at 11:00.
  -- Rows with other statuses are excluded (no ghost-reservation problem).
  CONSTRAINT no_overlapping_confirmed_bookings
    EXCLUDE USING gist (
      provider_id WITH =,
      tstzrange(scheduled_at, end_at, '[)') WITH &&
    )
    WHERE (status = 'confirmed')
);

CREATE INDEX idx_bookings_customer_id      ON public.bookings (customer_id);
CREATE INDEX idx_bookings_provider_id      ON public.bookings (provider_id);
CREATE INDEX idx_bookings_status           ON public.bookings (status);
CREATE INDEX idx_bookings_scheduled_at     ON public.bookings (scheduled_at);
-- Compound index for provider dashboard: bookings by provider + status + time
CREATE INDEX idx_bookings_provider_status  ON public.bookings (provider_id, status, scheduled_at);

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── end_at maintenance trigger ────────────────────────────────────
-- Fires on every INSERT and on UPDATE of scheduled_at or duration_minutes.
-- Also fires on all other UPDATE operations to prevent end_at from being
-- set to an incorrect value directly (which would corrupt the exclusion
-- constraint). Recomputing from unchanged fields costs a trivial amount.
CREATE OR REPLACE FUNCTION public.compute_booking_end_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.end_at := NEW.scheduled_at + (NEW.duration_minutes * interval '1 minute');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_end_at ON public.bookings;
CREATE TRIGGER bookings_set_end_at
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.compute_booking_end_at();

-- ── Address clearing trigger (GDPR) ──────────────────────────────
-- When a booking moves to a terminal status for the first time,
-- all precise location fields are cleared. address_city is kept
-- for aggregate analytics (city-level, non-identifying).
CREATE OR REPLACE FUNCTION public.clear_booking_address_on_terminal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'payment_failed', 'refunded')
     AND OLD.status NOT IN ('cancelled', 'payment_failed', 'refunded')
  THEN
    NEW.address_line  := NULL;
    NEW.address_lat   := NULL;
    NEW.address_lng   := NULL;
    NEW.address_notes := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_clear_address_on_terminal ON public.bookings;
CREATE TRIGGER bookings_clear_address_on_terminal
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.clear_booking_address_on_terminal_status();

-- ----------------------------------------------------------------
-- Table: payments
-- ----------------------------------------------------------------
-- One payment row per booking (UNIQUE on booking_id).
-- Status mirrors the Stripe PaymentIntent lifecycle.
-- Written exclusively by the Stripe webhook handler (service_role key).
-- Never modified by authenticated clients; never deleted.
CREATE TABLE public.payments (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Exactly one payment record per booking
  booking_id                  UUID        NOT NULL UNIQUE
                                            REFERENCES public.bookings(id) ON DELETE RESTRICT,

  -- Stripe identifiers (populated progressively as the lifecycle advances)
  stripe_payment_intent_id    TEXT        NOT NULL UNIQUE,
  stripe_charge_id            TEXT        UNIQUE,
  stripe_transfer_id          TEXT        UNIQUE,   -- set when provider payout is initiated

  -- Status mirrors Stripe PaymentIntent states
  status                      TEXT        NOT NULL DEFAULT 'pending'
                                            CHECK (status IN (
                                              'pending',      -- intent created, not yet confirmed
                                              'processing',   -- awaiting bank confirmation
                                              'paid',         -- payment succeeded
                                              'failed',       -- payment failed (card declined, etc.)
                                              'refunded'      -- partially or fully refunded
                                            )),

  -- Amounts in euro cents
  amount_cents                INTEGER     NOT NULL CHECK (amount_cents > 0),
  platform_fee_cents          INTEGER     NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  provider_amount_cents       INTEGER     NOT NULL DEFAULT 0 CHECK (provider_amount_cents >= 0),

  -- Refund tracking (supports partial refunds)
  refund_amount_cents         INTEGER     NOT NULL DEFAULT 0 CHECK (refund_amount_cents >= 0),
  stripe_refund_id            TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payments_refund_not_exceed_amount
    CHECK (refund_amount_cents <= amount_cents)
);

CREATE INDEX idx_payments_booking_id
  ON public.payments (booking_id);
CREATE INDEX idx_payments_stripe_payment_intent_id
  ON public.payments (stripe_payment_intent_id);
CREATE INDEX idx_payments_status
  ON public.payments (status);

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- Table: reviews
-- ----------------------------------------------------------------
-- Post-service reviews written by customers.
-- One review per booking (UNIQUE on booking_id).
-- Reviews are immutable after submission (no updated_at; no UPDATE for customers).
-- Soft-deleted via is_published = false (admin can hide; never hard-delete).
CREATE TABLE public.reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Exactly one review per booking
  booking_id   UUID        NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,

  -- Denormalised for efficient RLS checks and aggregate queries
  customer_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider_id  UUID        NOT NULL REFERENCES public.providers(id) ON DELETE RESTRICT,

  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,

  -- Admin can unpublish inappropriate reviews; never hard-delete
  is_published BOOLEAN     NOT NULL DEFAULT true,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: reviews are immutable after submission
);

CREATE INDEX idx_reviews_provider_id ON public.reviews (provider_id);
CREATE INDEX idx_reviews_customer_id ON public.reviews (customer_id);
-- Index for provider public profile: only published reviews, ordered by date
CREATE INDEX idx_reviews_provider_published
  ON public.reviews (provider_id, created_at DESC)
  WHERE is_published = true;

-- ── Provider rating stats trigger ─────────────────────────────────
-- After any INSERT, UPDATE, or DELETE on reviews, recalculate
-- avg_rating and total_reviews in the providers table.
-- SECURITY DEFINER lets the function bypass RLS on providers.
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

  UPDATE public.providers
  SET
    avg_rating    = v_avg_rating,          -- NULL when no published reviews
    total_reviews = COALESCE(v_total_reviews, 0),
    updated_at    = NOW()
  WHERE id = v_provider_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS reviews_update_provider_stats ON public.reviews;
CREATE TRIGGER reviews_update_provider_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_rating_stats();

-- ================================================================
-- rollback:
--   DROP TRIGGER IF EXISTS reviews_update_provider_stats      ON public.reviews;
--   DROP FUNCTION IF EXISTS public.update_provider_rating_stats();
--   DROP TRIGGER IF EXISTS bookings_clear_address_on_terminal ON public.bookings;
--   DROP FUNCTION IF EXISTS public.clear_booking_address_on_terminal_status();
--   DROP TRIGGER IF EXISTS bookings_set_end_at                ON public.bookings;
--   DROP FUNCTION IF EXISTS public.compute_booking_end_at();
--   DROP TRIGGER IF EXISTS payments_updated_at                ON public.payments;
--   DROP TRIGGER IF EXISTS bookings_updated_at                ON public.bookings;
--   DROP TABLE IF EXISTS public.reviews;
--   DROP TABLE IF EXISTS public.payments;
--   DROP TABLE IF EXISTS public.bookings;
-- ================================================================
