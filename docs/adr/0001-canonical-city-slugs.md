# ADR 0001 — Canonical City Slugs & Per-City Public Launch Gating

- **Status:** Accepted — implemented & applied in production
- **Date:** 2026-06-17
- **Migration:** `supabase/migrations/202606170001_city_slug_normalization.sql`
- **Config source of truth:** `lib/cities.ts`

---

## Context

Alvessa runs a supply-side multi-city recruitment phase (Utrecht, Amsterdam,
Rotterdam, Den Haag) while keeping the public user-facing product gated to a
single city until supply density is proven. Two problems had to be solved:

1. **Data integrity.** The city dimension (`providers.city`,
   `provider_applications.city`) was free-text display names defaulting to
   `'Utrecht'`. Free text invites casing/whitespace drift (`Den Haag` vs
   `den haag` vs `'s-Gravenhage`), and the public visibility gate compares the
   stored value against a fixed allow-list — string drift would silently
   break gating.
2. **Launch control.** Public visibility and recruitment visibility are
   independent axes. A city can be actively recruiting therapists while still
   being invisible to customers.

## Decision

### 1. The database stores canonical city **slugs** only

Allowed values for the city dimension:

```
utrecht  amsterdam  rotterdam  den-haag
```

Enforced by a `CHECK` constraint on **both** `providers.city` and
`provider_applications.city`. The column keeps the name `city` but now holds a
slug. Display names are **never** stored; they are derived at render time via
`getCityDisplayName(slug)` in `lib/cities.ts`.

> The DB must never again store `Utrecht`, `Amsterdam`, `Rotterdam`, `Den Haag`.
> `providers.studio_city` and `bookings.address_city` are **street-address**
> fields, are NOT part of this dimension, and are intentionally left free-text.

### 2. Public launch is gated by two flags, recruitment by a third

`lib/cities.ts` is the single source of truth. Each city carries:

```ts
status: 'researching' | 'supply_testing' | 'prelaunch' | 'active' | 'paused'
publicVisible: boolean       // user-facing
recruitmentVisible: boolean  // therapist-facing
```

- A city appears on **public** surfaces (homepage, nav, `/aanbod`, sitemap,
  SEO pages, metadata, provider/booking queries) **only** when
  `status === 'active' && publicVisible === true`.
- A city may be offered/mentioned in **recruitment** (`/voor-masseurs`,
  application form) when `recruitmentVisible === true`, regardless of public
  status.
- Provider queries gate by slug via `getPublicCitySlugs()`. An empty allow-list
  ⇒ no public providers (the safe default).

### 3. Deployment order is fixed: **code first, migration second**

Old code writes display names; the new DB accepts only slugs. Deploying the
migration before the code would make old write paths violate the `CHECK`
constraint. The required order is always:

1. Deploy code
2. Apply migration `202606170001`
3. Run validation queries

The new code is backward-tolerant of the pre-migration DB (gate returns empty,
`getCityDisplayName` falls back to the raw value), so code-first is safe.

## Current State (2026-06-17)

- **All four cities:** `publicVisible = false`. Public city launch remains
  gated. No city is publicly live.
- **Migration:** ✅ applied in production successfully.
- **Validation:** `SELECT DISTINCT city` on both tables returns only canonical
  slugs (`utrecht`). No display names remain.

## Consequences

- ✅ Gating logic compares slugs to slugs — no string-drift failure mode.
- ✅ Launching a city = flip `status`/`publicVisible` in `lib/cities.ts`. No DB
  change required to go live.
- ⚠️ Adding a **new** city requires altering **both** `CHECK` constraints (DB
  migration), in addition to a `lib/cities.ts` entry. This coupling is the
  deliberate price of integrity at this stage; revisit with a `cities`
  reference table if/when the list grows past ~10.
- ⚠️ Every write path must write a slug: application form/action, provider
  self-service profile (dropdown, not free text), admin approval copy.

## Rejected Alternatives

- **Keep free-text + app-level validation only.** Rejected: no hard guarantee;
  one missed write path reintroduces drift and silently breaks gating.
- **Rename column to `city_slug`.** Rejected: touches generated DB types and
  every `select`/read for no functional gain; keeping `city` is sufficient.
- **A full `cities` table with FK now.** Deferred: over-engineered for 4 cities
  pre-launch. Correct at 10-city scale, not today (YAGNI).

## Known Future Work (non-blocking)

- `app/[locale]/aanbod/[slug]/page.tsx:108-109` — provider page `<title>`
  hardcodes "Utrecht" regardless of the provider's city. Safe today (0 public
  providers, pages `noindex`). **Must be fixed before any multi-city public
  launch.**
