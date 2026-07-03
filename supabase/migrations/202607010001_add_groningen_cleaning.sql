-- Migration 026: Add Groningen city + Cleaning service category
--
-- Sprint 1 — Groningen Cleaning MVP
-- Foundation version: v2.2.1 (frozen)
--
-- Three logical operations:
--   1. Extend providers.city CHECK constraint to include 'groningen'
--   2. Extend provider_applications.city CHECK constraint to include 'groningen'
--   3. Insert cleaning service_category (slug = 'cleaning', sort_order = 2)
--   4. Insert five cleaning services linked to the new category
--
-- DEPLOYMENT ORDER EXCEPTION — READ BEFORE APPLYING:
--   ADR-0001 states "code first, migration second." That rule does NOT apply here.
--   For this migration (broadening a CHECK constraint allowlist), the correct order is:
--     MIGRATION FIRST → then promote the Vercel deployment.
--   Rationale: the migration is purely additive (only broadens the allowed set).
--   Running code before this migration creates a CHECK constraint violation window
--   in which any Groningen provider application submission will fail with a 500 error.
--
-- After applying, verify in the Supabase dashboard that both constraints contain
-- 'groningen' before promoting the Vercel deployment to production.
--
-- All changes are additive. No data is destroyed or migrated.
-- Prices in euro cents (e.g. 7900 = €79.00).
--
-- ROLLBACK:
--   -- Restore original 4-city constraints
--   ALTER TABLE public.providers
--     DROP CONSTRAINT providers_city_slug_check;
--   ALTER TABLE public.providers
--     ADD CONSTRAINT providers_city_slug_check
--     CHECK (city IN ('utrecht', 'amsterdam', 'rotterdam', 'den-haag'));
--
--   ALTER TABLE public.provider_applications
--     DROP CONSTRAINT provider_applications_city_slug_check;
--   ALTER TABLE public.provider_applications
--     ADD CONSTRAINT provider_applications_city_slug_check
--     CHECK (city IN ('utrecht', 'amsterdam', 'rotterdam', 'den-haag'));
--
--   DELETE FROM public.services
--     WHERE category_id = (SELECT id FROM public.service_categories WHERE slug = 'cleaning');
--   DELETE FROM public.service_categories WHERE slug = 'cleaning';

BEGIN;

-- ── 1. Extend providers.city CHECK constraint ──────────────────────────────

ALTER TABLE public.providers
  DROP CONSTRAINT providers_city_slug_check;

ALTER TABLE public.providers
  ADD CONSTRAINT providers_city_slug_check
  CHECK (city IN ('utrecht', 'amsterdam', 'rotterdam', 'den-haag', 'groningen'));

-- ── 2. Extend provider_applications.city CHECK constraint ─────────────────

ALTER TABLE public.provider_applications
  DROP CONSTRAINT provider_applications_city_slug_check;

ALTER TABLE public.provider_applications
  ADD CONSTRAINT provider_applications_city_slug_check
  CHECK (city IN ('utrecht', 'amsterdam', 'rotterdam', 'den-haag', 'groningen'));

-- ── 3. Insert cleaning service category ───────────────────────────────────

INSERT INTO public.service_categories (id, slug, name_nl, name_en, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'cleaning',
  'Schoonmaak',
  'Cleaning',
  true,
  2
);

-- ── 4. Insert five cleaning services ──────────────────────────────────────
-- Uses a subquery to look up category by slug — no hardcoded UUIDs.
-- Prices confirmed by business owner (Sprint 1 Audit, 2026-07-01).

INSERT INTO public.services (
  id,
  category_id,
  name_nl,
  name_en,
  duration_minutes,
  base_price_cents,
  is_active,
  sort_order
)
SELECT
  gen_random_uuid(),
  sc.id,
  v.name_nl,
  v.name_en,
  v.duration_minutes,
  v.base_price_cents,
  true,
  v.sort_order
FROM public.service_categories sc
CROSS JOIN (
  VALUES
    -- 1. Cleaning 2 hours (€79.00)
    ('Schoonmaak 2 uur',        'Cleaning 2 hours',         120::SMALLINT, 7900,  1),
    -- 2. Cleaning 3 hours (€109.00)
    ('Schoonmaak 3 uur',        'Cleaning 3 hours',         180::SMALLINT, 10900, 2),
    -- 3. Cleaning 4 hours (€139.00)
    ('Schoonmaak 4 uur',        'Cleaning 4 hours',         240::SMALLINT, 13900, 3),
    -- 4. Deep clean (€169.00)
    ('Dieptereiniging',         'Deep clean',               240::SMALLINT, 16900, 4),
    -- 5. End of tenancy clean (€199.00)
    ('Einde huur schoonmaak',   'End of tenancy clean',     300::SMALLINT, 19900, 5)
) AS v(name_nl, name_en, duration_minutes, base_price_cents, sort_order)
WHERE sc.slug = 'cleaning';

COMMIT;
