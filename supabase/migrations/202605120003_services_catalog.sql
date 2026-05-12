-- =============================================================
-- Migration 003: Service Catalog
-- Project: Zenzo Marketplace
-- Purpose: Platform-wide service catalog.
--
--   service_categories — top-level categories (massage, cleaning…)
--   services           — specific offerings within a category
--   provider_services  — which services a provider offers + pricing
--
-- Design decisions:
--   - All monetary values stored as integer euro cents.
--     Avoids floating-point rounding errors entirely.
--   - Service names are bilingual (name_nl / name_en) for the
--     Dutch-first + English-second i18n strategy.
--   - provider_services.custom_price_cents overrides base_price_cents
--     when non-NULL. Application resolves the effective price as:
--     COALESCE(ps.custom_price_cents, s.base_price_cents)
--   - UNIQUE(provider_id, service_id) prevents duplicate links.
--   - Soft delete via is_active = false; never hard-delete rows
--     that bookings.provider_service_id may reference.
--   - Generic naming: no "massage" in column or table names.
--     See docs/ARCHITECTURE_FREEZE.md decision #2.
-- =============================================================

-- ----------------------------------------------------------------
-- Table: service_categories
-- ----------------------------------------------------------------
CREATE TABLE public.service_categories (
  id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT     NOT NULL UNIQUE
                         CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*$'),
  name_nl     TEXT     NOT NULL CHECK (length(trim(name_nl)) > 0),
  name_en     TEXT     NOT NULL CHECK (length(trim(name_en)) > 0),
  is_active   BOOLEAN  NOT NULL DEFAULT true,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: categories are rarely changed; admin edits via service_role
);

CREATE INDEX idx_service_categories_active
  ON public.service_categories (sort_order) WHERE is_active = true;

-- ----------------------------------------------------------------
-- Table: services
-- ----------------------------------------------------------------
CREATE TABLE public.services (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      UUID        NOT NULL
                                 REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  name_nl          TEXT        NOT NULL CHECK (length(trim(name_nl)) > 0),
  name_en          TEXT        NOT NULL CHECK (length(trim(name_en)) > 0),
  description_nl   TEXT,
  description_en   TEXT,
  -- Duration: 15-minute minimum, 8-hour maximum
  duration_minutes SMALLINT    NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  -- Base price in euro cents (e.g. 8000 = €80.00)
  base_price_cents INTEGER     NOT NULL CHECK (base_price_cents > 0),
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  sort_order       SMALLINT    NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category_id
  ON public.services (category_id, sort_order);
CREATE INDEX idx_services_active
  ON public.services (category_id, sort_order) WHERE is_active = true;

DROP TRIGGER IF EXISTS services_updated_at ON public.services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- Table: provider_services
-- ----------------------------------------------------------------
CREATE TABLE public.provider_services (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID        NOT NULL
                                    REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id          UUID        NOT NULL
                                    REFERENCES public.services(id)  ON DELETE RESTRICT,

  -- NULL → use services.base_price_cents; set → provider's custom price
  custom_price_cents  INTEGER     CHECK (custom_price_cents > 0),

  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per provider-service combination
  CONSTRAINT uq_provider_service UNIQUE (provider_id, service_id)
);

CREATE INDEX idx_provider_services_provider
  ON public.provider_services (provider_id);
CREATE INDEX idx_provider_services_service
  ON public.provider_services (service_id);
CREATE INDEX idx_provider_services_active
  ON public.provider_services (provider_id) WHERE is_active = true;

DROP TRIGGER IF EXISTS provider_services_updated_at ON public.provider_services;
CREATE TRIGGER provider_services_updated_at
  BEFORE UPDATE ON public.provider_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- rollback:
--   DROP TRIGGER IF EXISTS provider_services_updated_at ON public.provider_services;
--   DROP TRIGGER IF EXISTS services_updated_at           ON public.services;
--   DROP TABLE IF EXISTS public.provider_services;
--   DROP TABLE IF EXISTS public.services;
--   DROP TABLE IF EXISTS public.service_categories;
-- ================================================================
