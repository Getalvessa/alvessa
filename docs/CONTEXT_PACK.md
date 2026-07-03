# Context Pack — Primary Startup Document

> Read this + `docs/STATE.md` + `docs/CURRENT_SPRINT.md` at session start.
> Then load ONLY the subsystem documents your task requires. Max 120 lines — do not grow this file.

## 1. Project Summary

Alvessa — Dutch-first home services marketplace. Live track: Utrecht mobile massage (built, not public).
Active track: Groningen cleaning MVP (`docs/EXECUTION_ROADMAP.md`). PWA only, NL primary / EN secondary.
Vision & business rationale: `docs/PROJECT_VISION.md`, `docs/DECISION_LOG.md`.

## 2. Current State

Operational state, open debts, next task: `docs/STATE.md` (always current).
Active sprint scope: `docs/CURRENT_SPRINT.md`.

## 3. Architecture Constraints (authoritative: `docs/ARCHITECTURE_FREEZE.md`)

- Next.js 16.2.6 App Router (`proxy.ts`, awaited `params`) — never Pages Router
- Generic marketplace naming in schema/API (`providers`, `bookings` — never `massage_*`)
- All UI strings via next-intl (`messages/nl.json` primary, `en.json`); `localePrefix: 'as-needed'`
- DB access only via Supabase client; no pre-generated time-slot tables
- City dimension = canonical slugs + visibility gate (`lib/cities.ts`) — `docs/adr/0001-canonical-city-slugs.md`
- Category behaviour = typed config keyed by `service_categories.slug` (`lib/categories.ts`) — capabilities + commission; never detect categories from service names

## 4. Stable Modules (authoritative: `docs/STABLE_MODULES.md` — read BEFORE touching booking/payment/RLS/auth)

1. Booking pricing integrity (server-derived price)   6. Stripe webhook conflict handling
2. Booking INSERT — service_role only                  7. Open redirect protection
3. Booking UPDATE RLS + tampering trigger              8. Availability RLS blind-spot fix
4. Provider cannot confirm unpaid booking              9. scheduled_at two-layer validation
5. Proxy/middleware role protection                   10. City visibility gate & canonical slugs

## 5. Schema Summary (authoritative: `docs/SCHEMA_SNAPSHOT.md` — never scan migrations for schema)

Tables: `profiles`, `providers`, `services`, `service_categories`, `provider_services`,
`bookings`, `payments`, `reviews`, `admin_audit_log`, `provider_applications`,
`availability_schedules`, `availability_exceptions`.
Key invariants: bookings INSERT = service_role only; `pending_payment → confirmed` = webhook only;
tampering triggers on bookings/providers/profiles; helper fns `is_admin()`, `get_my_provider_id()`.

## 6. Subsystem Map (authoritative: `docs/PROJECT_MAP.md` — full file lists there)

| Subsystem | Risk | Area |
|---|---|---|
| A Booking/Payment | 🔴 | `aanbod/[slug]/boeken/*`, `api/availability`, `api/stripe/webhook` |
| B Security/Auth/RLS | 🔴 | `proxy.ts`, `lib/supabase/*`, `supabase/migrations/` |
| C i18n/Copy/Legal | 🟡 | `messages/*`, legal pages |
| D Provider Dashboard | 🟢 | `app/[locale]/dashboard/*` |
| E Admin | 🟡 | `app/[locale]/admin/*` |
| F Public Pages | 🟢 | homepage, listing, SEO landings |

## 7. Open Debts

Tracked exclusively in `docs/STATE.md` → Open Debts. Do not duplicate here.

## 8. Expansion Rules — When to Load More

| Task touches… | Load |
|---|---|
| Any task (workflow, scope, budgets) | `docs/AI_WORKFLOW.md`, `docs/CONTEXT_BUDGET.md` |
| Database / types / schema | `docs/SCHEMA_SNAPSHOT.md` |
| Booking / payment / RLS / auth / webhook | `docs/STABLE_MODULES.md` |
| Specific files in a subsystem | `docs/PROJECT_MAP.md` |
| Sprint planning / roadmap questions | `docs/EXECUTION_ROADMAP.md` |
| Task template selection | `docs/FEATURE_OWNERSHIP.md` → ONE `prompts/*` template |
| New migration / named trigger audit | Max 2 files from `supabase/migrations/` |

Never load all `prompts/*` templates. Never scan the repo before reading `docs/PROJECT_MAP.md`.
