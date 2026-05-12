-- =============================================================
-- Migration 007: Seed — Service Catalog
-- Project: Zenzo Marketplace
-- Purpose: Insert the initial massage service category and
--          six service offerings for the Utrecht MVP launch.
--
-- What IS seeded here (safe without auth users):
--   - 1 service_category: massage
--   - 6 services: Swedish (60/90 min), Deep tissue (60/90 min),
--                 Relaxation massage (60 min), Sports massage (60 min)
--
-- What is NOT seeded here:
--   - Provider accounts (require real auth.users to exist first)
--   - provider_services rows (depend on providers)
--   - availability_schedules (depend on providers)
--   - Booking or payment records (require live providers + customers)
--
-- To create test providers after this migration:
--   1. Register provider accounts via Supabase Auth dashboard
--   2. Run: npx ts-node scripts/seed-test-providers.ts <email>
--
-- Prices in euro cents (e.g. 8000 = €80.00).
-- All services initially active, ordered by sort_order.
-- =============================================================

-- ── Service category: massage ─────────────────────────────────────

INSERT INTO public.service_categories (id, slug, name_nl, name_en, is_active, sort_order)
VALUES (
  gen_random_uuid(),
  'massage',
  'Massage',
  'Massage',
  true,
  1
);

-- ── Services (6 offerings) ────────────────────────────────────────
-- Uses a subquery to look up the category by slug, so no hardcoded UUIDs.

INSERT INTO public.services (
  id,
  category_id,
  name_nl,
  name_en,
  description_nl,
  description_en,
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
  v.description_nl,
  v.description_en,
  v.duration_minutes,
  v.base_price_cents,
  true,
  v.sort_order
FROM public.service_categories sc
CROSS JOIN (
  VALUES
    -- 1. Swedish massage — 60 min (€80)
    (
      'Zweeds massage',
      'Swedish massage',
      'Een ontspannende massage met lange, vloeiende streken. Bevordert de doorbloeding, vermindert spierspanning en brengt diepe rust.',
      'A relaxing massage using long, flowing strokes. Improves circulation, reduces muscle tension and promotes deep relaxation.',
      60::SMALLINT,
      8000,
      1
    ),
    -- 2. Swedish massage — 90 min (€110)
    (
      'Zweeds massage',
      'Swedish massage',
      'Verlengde sessie voor een volledig lichaamsherstel en langdurige ontspanning. Ideaal als je er echt even helemaal tussenuit wilt.',
      'Extended session for full body recovery and lasting relaxation. Ideal when you need to fully unwind.',
      90::SMALLINT,
      11000,
      2
    ),
    -- 3. Deep tissue massage — 60 min (€90)
    (
      'Deep tissue massage',
      'Deep tissue massage',
      'Intensieve massage gericht op de diepere spierlagen en het bindweefsel. Verlicht chronische spierspanning en bevordert herstel.',
      'Intensive massage targeting deeper muscle layers and connective tissue. Relieves chronic muscle tension and promotes recovery.',
      60::SMALLINT,
      9000,
      3
    ),
    -- 4. Deep tissue massage — 90 min (€120)
    (
      'Deep tissue massage',
      'Deep tissue massage',
      'Verlengde deep tissue sessie voor complexe en hardnekkige spierproblemen. Geeft ruimte voor grondiger werk op probleemgebieden.',
      'Extended deep tissue session for complex and persistent muscle issues. Allows for more thorough work on problem areas.',
      90::SMALLINT,
      12000,
      4
    ),
    -- 5. Relaxation massage — 60 min (€75)
    (
      'Ontspanningsmassage',
      'Relaxation massage',
      'Een zachte, kalmerende massage voor totale ontspanning van lichaam en geest. Perfect na een drukke of stressvolle periode.',
      'A gentle, soothing massage for total relaxation of body and mind. Perfect after a busy or stressful period.',
      60::SMALLINT,
      7500,
      5
    ),
    -- 6. Sports massage — 60 min (€85)
    (
      'Sportsmassage',
      'Sports massage',
      'Gerichte massage voor sporters en actief levende mensen. Bevordert spierherstel na inspanning, verhoogt de doorbloeding en vermindert blessurerisico.',
      'Targeted massage for athletes and active people. Promotes muscle recovery after exercise, increases circulation and reduces injury risk.',
      60::SMALLINT,
      8500,
      6
    )
) AS v(name_nl, name_en, description_nl, description_en, duration_minutes, base_price_cents, sort_order)
WHERE sc.slug = 'massage';

-- ================================================================
-- rollback:
--   DELETE FROM public.services
--     WHERE category_id = (SELECT id FROM public.service_categories WHERE slug = 'massage');
--   DELETE FROM public.service_categories WHERE slug = 'massage';
-- ================================================================
