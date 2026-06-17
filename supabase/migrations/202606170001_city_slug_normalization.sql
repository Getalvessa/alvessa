-- Migration 025: normalize city values to canonical slugs
--
-- Converts providers.city and provider_applications.city from free-text display
-- names (e.g. 'Utrecht', 'Den Haag') to canonical slugs ('utrecht', 'den-haag').
-- displayName is derived in app code from lib/cities.ts (getCityDisplayName).
-- A CHECK constraint guarantees only known city slugs are ever stored, removing
-- the free-text/casing/whitespace matching hazard the gating queries depended on.
--
-- The `city` column keeps its name but now holds a canonical slug.
-- `providers.studio_city` is a street address field and is intentionally untouched.
--
-- Safe to run while tables are near-empty (pre-launch). Adding a new city later
-- requires altering BOTH CHECK constraints below.
--
-- ROLLBACK:
--   ALTER TABLE public.providers            DROP CONSTRAINT providers_city_slug_check;
--   ALTER TABLE public.provider_applications DROP CONSTRAINT provider_applications_city_slug_check;
--   ALTER TABLE public.providers            ALTER COLUMN city SET DEFAULT 'Utrecht';
--   ALTER TABLE public.provider_applications ALTER COLUMN city SET DEFAULT 'Utrecht';
--   -- values remain slugs; restore display names manually if required.

BEGIN;

-- 1. Map known display-name variants → canonical slug (case/space tolerant).
WITH city_map(name, slug) AS (
  VALUES
    ('utrecht',        'utrecht'),
    ('amsterdam',      'amsterdam'),
    ('rotterdam',      'rotterdam'),
    ('den haag',       'den-haag'),
    ('den-haag',       'den-haag'),
    ('the hague',      'den-haag'),
    ('s-gravenhage',   'den-haag'),
    ('''s-gravenhage', 'den-haag')
)
UPDATE public.providers p
SET city = m.slug
FROM city_map m
WHERE lower(trim(p.city)) = m.name;

WITH city_map(name, slug) AS (
  VALUES
    ('utrecht',        'utrecht'),
    ('amsterdam',      'amsterdam'),
    ('rotterdam',      'rotterdam'),
    ('den haag',       'den-haag'),
    ('den-haag',       'den-haag'),
    ('the hague',      'den-haag'),
    ('s-gravenhage',   'den-haag'),
    ('''s-gravenhage', 'den-haag')
)
UPDATE public.provider_applications a
SET city = m.slug
FROM city_map m
WHERE lower(trim(a.city)) = m.name;

-- 2. Any value still not a known slug → safe fallback (prevents CHECK failure).
--    At 0 live providers this is a no-op in practice; kept for correctness.
UPDATE public.providers
SET city = 'utrecht'
WHERE city NOT IN ('utrecht', 'amsterdam', 'rotterdam', 'den-haag');

UPDATE public.provider_applications
SET city = 'utrecht'
WHERE city NOT IN ('utrecht', 'amsterdam', 'rotterdam', 'den-haag');

-- 3. Defaults now use slug form.
ALTER TABLE public.providers            ALTER COLUMN city SET DEFAULT 'utrecht';
ALTER TABLE public.provider_applications ALTER COLUMN city SET DEFAULT 'utrecht';

-- 4. Constrain to the known city slug set.
ALTER TABLE public.providers
  ADD CONSTRAINT providers_city_slug_check
  CHECK (city IN ('utrecht', 'amsterdam', 'rotterdam', 'den-haag'));

ALTER TABLE public.provider_applications
  ADD CONSTRAINT provider_applications_city_slug_check
  CHECK (city IN ('utrecht', 'amsterdam', 'rotterdam', 'den-haag'));

COMMIT;
