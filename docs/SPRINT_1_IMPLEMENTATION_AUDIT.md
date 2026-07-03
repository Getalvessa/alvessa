# Sprint 1 Implementation Audit — Groningen Cleaning MVP

> **Audit type:** Read-only pre-implementation analysis.
> No code was modified. No migrations were written. No SQL was executed.
>
> **Audit scope:** Every file in the repository that Sprint 1 will require touching.
> **Stop condition:** Audit complete. Awaiting implementation approval.
>
> **Auditor:** CTO / Lead Engineer
> **Date:** 2026-07-01
> **Foundation version:** v2.2.1 (frozen)

---

## Executive Summary

Sprint 1 is **narrower than expected**. The existing architecture handles Groningen and the
Cleaning category almost entirely through existing dynamic patterns. The city dropdown,
city validation, city display, and public gating all read from `lib/cities.ts` at runtime —
adding `groningen` to that config file is the single largest code change.

**Total files requiring change: 4.**

This is the correct outcome for a well-designed generic marketplace schema. The architecture
works as intended.

One critical deployment-order finding is documented below. It contradicts the instruction in
`docs/adr/0001-canonical-city-slugs.md` for this specific migration type and must be resolved
before implementation begins.

---

## Repository Analysis

### Full File Inventory — Sprint 1 Impact Assessment

| Module | Total Files | Affected by Sprint 1 | Risk |
|---|---|---|---|
| Database migrations | 25 existing | 1 new required | Medium |
| City config | 1 | 1 | Low |
| i18n copy | 2 | 2 (copy-only) | Low |
| Provider application form | 2 | 0 — dynamic already | None |
| Application server action | 1 | 0 — dynamic already | None |
| Admin aanbieders | 4 | 0 — dynamic already | None |
| Provider dashboard diensten | 2 | 0 now; debt noted | None (Sprint 1) |
| Public providers lib | 1 | 0 — city gate correct | None |
| Booking flow (Subsystem A) | 7 | 0 | None |
| Stripe webhook | 1 | 0 | None |
| Auth / middleware | 1 | 0 | None |
| Sitemap | 1 | 0 | None |
| SEO landing pages | 4 | 0 | None |
| Type definitions | 2 | 0 (doc debt noted) | None |
| All other files | ~35 | 0 | None |

---

## Affected Files — Full Detail

---

### File 1 — `supabase/migrations/[new]_add_groningen_cleaning.sql`

**Status:** New file — does not exist yet.

**Why it must change:**

The current city CHECK constraints (migration 025, applied to both `providers.city` and
`provider_applications.city`) enumerate exactly four city slugs: `utrecht`, `amsterdam`,
`rotterdam`, `den-haag`. Any INSERT or UPDATE attempting `city = 'groningen'` will fail with
a PostgreSQL `check_constraint_violation` error. This hard-blocks the ability to:
(a) accept a Groningen provider application via the form, and
(b) create a Groningen provider record during admin approval.

Additionally, no `service_categories` row exists for `cleaning`, and no `services` rows exist
for cleaning service types. The `dashboard/diensten` page and the booking engine both read
from these tables. Without seed rows, a cleaning provider's dashboard would show zero
available services, and a customer could not book any cleaning service.

This migration is the prerequisite for every other Sprint 1 change and every downstream sprint.

**Expected modification:**

Three logical operations in one migration file:
1. ALTER `providers.city` CHECK constraint — extend allowed set to include `groningen`
2. ALTER `provider_applications.city` CHECK constraint — same extension
3. INSERT one `service_categories` row: `slug = 'cleaning'`, `name_nl = 'Schoonmaak'`,
   `name_en = 'Cleaning'`, `is_active = true`, `sort_order = 2`
4. INSERT five `services` rows linked to the new cleaning category (details in Migration
   Analysis section below)

Following the pattern of migration 025, this must be wrapped in `BEGIN / COMMIT` and include
a rollback block comment.

**Estimated complexity:** Low

**Estimated risk:** Medium

Reasoning: The ALTER TABLE statements are additive (no data destroyed), but they are
irreversible without a new migration. The seed data INSERT is safe and follows the exact
pattern of migration 007. Medium risk because any error in the service pricing data requires
a separate correction migration after deployment.

**Architecture impact:** None

The schema does not change structurally. `providers.city` and `provider_applications.city`
remain `text` columns. Only the allowed value set in the CHECK constraint is extended.
The `service_categories` and `services` tables already exist with the correct schema — this
is pure data, not structure.

---

### File 2 — `lib/cities.ts`

**Status:** Existing file — requires one additive change.

**Why it must change:**

`lib/cities.ts` is the single source of truth for which cities exist and their visibility
status. Three downstream functions read from it at runtime:
- `getRecruitmentCitySlugs()` — used by the application form and server action to determine
  which cities are valid submission targets
- `isRecruitmentCitySlug()` — server-side validation in `voor-masseurs/aanmelden/actions.ts`
- `getPublicCitySlugs()` — used by `lib/providers/public.ts` to gate all public surfaces

Until `groningen` appears in the `CITIES` array, `getRecruitmentCitySlugs()` will not return
it, so the city dropdown on the application form will not offer Groningen. More critically,
`isRecruitmentCitySlug('groningen')` returns `false`, meaning even if a user manually
submitted `city: 'groningen'`, the server action would silently fall back to the first
recruitment city (currently `utrecht`). Groningen would never reach the database.

**Expected modification:**

Add one entry to the `CITIES` array:
```typescript
{
  slug: 'groningen',
  displayName: 'Groningen',
  status: 'prelaunch',
  publicVisible: false,
  recruitmentVisible: true,
}
```

No function signatures change. No imports change. The `publicVisible: false` ensures
Groningen does not appear on any public-facing surface (`/aanbod`, sitemap, provider
profiles) until a future Sprint 8 flag flip.

**Estimated complexity:** Low

**Estimated risk:** Low

The only risk is deploying this change before the database migration runs. If `lib/cities.ts`
is deployed first, the application form will offer Groningen as an option. A user who submits
a Groningen application between code deployment and migration execution will trigger a
PostgreSQL CHECK constraint violation (server error 500 visible to the user). See the Risk
Register for full analysis and mitigation.

**Architecture impact:** None

The `CityStatus` type union (`'researching' | 'supply_testing' | 'prelaunch' | 'active' |
'paused'`) already includes `'prelaunch'`. No type changes are needed.

---

### File 3 — `messages/nl.json`

**Status:** Existing file — two string values require copy update.

**Why it must change:**

Two keys in the `forProviders` namespace hardcode a fixed list of cities. When
`lib/cities.ts` adds Groningen with `recruitmentVisible: true`, these strings become
factually incorrect — they still say "Utrecht, Amsterdam, Rotterdam en Den Haag" while
the city dropdown now also offers Groningen.

**Key 1 — `forProviders.applyCityHelper` (line 163 of current file):**
```
"applyCityHelper": "Kies de stad waar je actief bent of wilt starten.
 We evalueren momenteel Utrecht, Amsterdam, Rotterdam en Den Haag."
```
This is the helper text rendered directly below the city dropdown on the application form.
A Groningen applicant selects Groningen from the dropdown, reads this text, and sees their
city is not listed. Confusing at minimum; trust-damaging at worst.

**Key 2 — `forProviders.cityEvaluationNote` (line 131 of current file):**
```
"cityEvaluationNote": "Alvessa nodigt nu Founding Therapeuten uit en evalueert momenteel
een aantal geselecteerde startsteden: Utrecht, Amsterdam, Rotterdam en Den Haag."
```
This renders in the `PageHeader` of `/voor-masseurs`. Same issue — city list is out of date.

**Expected modification:**

Both strings: append `"en Groningen"` (or equivalent rephrasing) to the city enumeration.
No key renames. No structural changes. Pure copy update.

**Estimated complexity:** Low

**Estimated risk:** Low

Copy-only change. Worst case: a typo in the copy. No functional impact.

**Architecture impact:** None

---

### File 4 — `messages/en.json`

**Status:** Existing file — same two keys as NL require English equivalents.

**Why it must change:**

`messages/en.json` mirrors the namespace structure of `messages/nl.json`. The same two keys
(`forProviders.applyCityHelper` and `forProviders.cityEvaluationNote`) will have their Dutch
city lists in NL, but the EN version will still enumerate only four cities. Any English-
language visitor to the application form will see the inconsistency.

**Expected modification:**

Same as NL: update the city list in both EN strings to include Groningen.

**Estimated complexity:** Low

**Estimated risk:** Low

**Architecture impact:** None

---

## Files Verified as NOT Affected by Sprint 1

These files were inspected. No changes are required. The reasons are documented to
prevent unnecessary edits during implementation.

| File | Why Not Affected |
|---|---|
| `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` | City dropdown uses `getRecruitmentCities()` — fully dynamic; Groningen appears automatically once `lib/cities.ts` is updated |
| `app/[locale]/voor-masseurs/aanmelden/actions.ts` | City validation uses `isRecruitmentCitySlug()` — fully dynamic; accepts Groningen automatically |
| `lib/providers/public.ts` | Public city gate uses `getPublicCitySlugs()`; Groningen is excluded automatically while `publicVisible: false` |
| `app/[locale]/aanbod/page.tsx` | Calls `fetchPublicProviders()` which is already gated; zero change needed |
| `app/[locale]/aanbod/[slug]/page.tsx` | Same city gate; Groningen providers are not reachable |
| `app/[locale]/aanbod/[slug]/boeken/actions.ts` | No change; category-agnostic; protected by city gate upstream |
| `app/[locale]/admin/aanbieders/applications-list.tsx` | Uses `getCityDisplayName(app.city)` — will render "Groningen" correctly for new applications |
| `app/[locale]/admin/aanbieders/actions.ts` | Uses `app.city` directly from DB; city-agnostic |
| `app/[locale]/admin/aanbieders/page.tsx` | Fetches all pending applications; Groningen applications will appear correctly |
| `app/[locale]/dashboard/diensten/page.tsx` | No Sprint 1 change needed. **Debt noted: see below.** |
| `app/[locale]/dashboard/diensten/actions.ts` | Same |
| `app/api/stripe/webhook/route.ts` | Not touched; category-agnostic |
| `app/api/availability/route.ts` | Not touched; category-agnostic |
| `proxy.ts` | Not touched; route protection unchanged |
| `app/sitemap.ts` | Not touched; Groningen is not public |
| `app/robots.ts` | Not touched |
| `app/manifest.ts` | Not touched |
| `lib/types/database.ts` | City is typed as `string`, not a union — no TypeScript change needed |
| `lib/types/marketplace.ts` | Comment `// 'Utrecht' for MVP` is stale doc debt; not blocking |
| `lib/stripe.ts` | Not touched |
| `lib/email.ts` | Not touched |
| All SEO landing pages | Utrecht-specific; remain valid |
| All other dashboard pages | No change |

---

## Identified Technical Debt (Not Sprint 1 — Document Only)

### Debt 1 — Provider Services Dashboard Shows All Categories

**Location:** `app/[locale]/dashboard/diensten/page.tsx` → `getServicesData()`

**Current behavior:**
```typescript
supabase.from('services').select('...').eq('is_active', true)
```

This query fetches ALL active services across ALL categories. Once Sprint 1 seeds cleaning
services, every existing massage provider's `/dashboard/diensten` page will display cleaning
services alongside massage services. A massage provider could accidentally enable a cleaning
service on their profile.

**Sprint 1 impact:** None — no active massage providers exist in production with live
customers. The visual contamination exists but causes no booking harm.

**Must fix:** Sprint 2 or Sprint 3, before any cleaning provider onboards.
**Fix:** Add `category_id` filter to the services query, scoped to the provider's registered
category. This requires either storing the provider's primary category, or reading it from
their registered `service_types` field.

### Debt 2 — `lib/types/marketplace.ts` Stale Comment

**Location:** `lib/types/marketplace.ts`, `Provider.city` field comment.

```typescript
city: string; // 'Utrecht' for MVP
```

This comment will be outdated once Groningen is added. Low priority documentation debt.
No functional impact.

**Must fix:** Ongoing maintenance. Low urgency.

### Debt 3 — `voor-masseurs/page.tsx` Copy is Utrecht/Massage-Specific

**Location:** `app/[locale]/voor-masseurs/page.tsx`

Multiple sections hardcode massage/Utrecht framing:
- `req5`: `"Werkgebied in of rondom Utrecht"` — exclusionary for Groningen applicants
- `FoundingTherapistSection` and `CtaSection` reference "Utrecht" as the first city
- The entire page is branded for massage, not applicable to cleaning partners

**Sprint 1 impact:** None — Groningen cleaning partners will be directed to a new
`/voor-schoonmakers` page (Sprint 3). The existing page is left untouched.

**Must fix:** Sprint 3, when `voor-schoonmakers` page is built.

---

## Migration Analysis

### Is a database migration required? **Yes.**

### Migration type breakdown:

| Operation | Type | Tables |
|---|---|---|
| Extend city slug allowlist | Schema — ALTER TABLE, modify CHECK constraint | `providers`, `provider_applications` |
| Insert cleaning category | Seed data — INSERT | `service_categories` |
| Insert cleaning services | Seed data — INSERT | `services` |

### Constraint modification — conceptual description:

Both `providers_city_slug_check` and `provider_applications_city_slug_check` currently
enumerate `('utrecht', 'amsterdam', 'rotterdam', 'den-haag')`. Both constraints must be
dropped and re-added with `groningen` added to the allowed set. The existing four values
are preserved exactly. No data is migrated — only the constraint definition changes.

### Seed data — service_categories:

One row: `slug = 'cleaning'`, `name_nl = 'Schoonmaak'`, `name_en = 'Cleaning'`,
`is_active = true`, `sort_order = 2`.

The `category_id` for this row is a generated UUID. Downstream `services` rows reference it
via a subquery on `slug = 'cleaning'`, following the exact pattern of migration 007 (which
looked up `slug = 'massage'`). No hardcoded UUIDs.

### Seed data — services (5 rows, linked to cleaning category):

Prices below are proposals — **must be confirmed by the business owner before implementation.**
All prices in euro cents. All services default `is_active = true`.

| NL Name | EN Name | Duration | Base Price | Sort |
|---|---|---|---|---|
| Schoonmaak 2 uur | Cleaning 2 hours | 120 min | €79.00 (7900 cents) | 1 |
| Schoonmaak 3 uur | Cleaning 3 hours | 180 min | €109.00 (10900 cents) | 2 |
| Schoonmaak 4 uur | Cleaning 4 hours | 240 min | €139.00 (13900 cents) | 3 |
| Dieptereiniging | Deep clean | 240 min | €169.00 (16900 cents) | 4 |
| Einde huur schoonmaak | End of tenancy clean | 300 min | €199.00 (19900 cents) | 5 |

> **Blocker:** These prices must be confirmed before the migration is written.
> Once inserted, a correction requires a new migration.

### `lib/types/database.ts` — update required?

**No.** The `providers.city` and `provider_applications.city` columns are typed as `string`
in `database.ts` — not as a TypeScript union type. The CHECK constraint is enforced at the
database level only. No TypeScript change is needed in `database.ts`.

---

## Dependency Graph

```
[Business owner confirms cleaning service prices]
            │
            ▼
[Migration: ALTER CHECK constraints + INSERT cleaning seed data]
            │
            ▼
[lib/cities.ts: add groningen entry]
            │
            ▼
[messages/nl.json + messages/en.json: update city lists in 2 copy strings]
            │
            ▼
[Automatic — no code change needed]
            │
   ┌────────┼────────────────────┐
   ▼                             ▼
Application form            Admin aanbieders
dropdown shows Groningen    shows Groningen apps
   │                             │
   ▼                             ▼
Groningen applications      Admin can approve
saved with correct slug     Groningen providers
```

### Critical path explanation:

The migration is the root dependency. Nothing else in Sprint 1 can be tested without it
because:
1. Without the ALTER to CHECK constraints, any attempt to INSERT a Groningen provider/
   application row fails at the database layer.
2. Without the cleaning service seed data, the `dashboard/diensten` page shows nothing
   for a cleaning provider and the booking engine has no services to offer.

`lib/cities.ts` depends on the migration being committed (deployed). Not vice versa —
but see the deployment order risk below.

The i18n copy changes depend on `lib/cities.ts` logically (Groningen must be in the config
before the copy is relevant), but can be done in the same commit with no ordering risk.

---

## Risk Register

### Risk 1 — Deployment Order: Code Before Migration

**Risk:** Developer deploys `lib/cities.ts` (Groningen added to `recruitmentVisible: true`)
before the database migration is executed. During the deployment window, a user submits a
Groningen provider application. The server action passes `isRecruitmentCitySlug('groningen')
= true` (code says valid), but the DB INSERT hits the CHECK constraint which still reads
`('utrecht', 'amsterdam', 'rotterdam', 'den-haag')`. The INSERT fails with a
`check_constraint_violation` error. The user sees a server error on form submission.

**Probability:** Medium — developers habitually follow "code first, migration second" per
ADR-0001. For THIS migration, that order is wrong.

**Impact:** Medium — a real Groningen applicant gets a 500 error. Application data is
lost. Trust damage.

**Mitigation:**

> ⚠️ ADR-0001 states "code first, migration second." **That rule does not apply here.**
> ADR-0001 was written for a data normalization migration where old code needed to run
> during the transition window. For THIS migration (adding a new CHECK value), the
> correct deployment order is: **MIGRATION FIRST, then code.**
>
> Rationale: The migration is purely additive — it only broadens the allowed set. Running
> it before the code is fully safe. Running the code before the migration creates a
> constraint violation window.

**Required action:** Document this deployment order exception in the PR description.
The Supabase migration must be applied (confirmed in Supabase dashboard) before the Vercel
deployment is promoted to production.

---

### Risk 2 — Service Prices Incorrect in Migration

**Risk:** The five cleaning service `base_price_cents` values are written into the
migration based on estimates. After the migration runs in production, the business owner
determines a price is wrong. A correction requires writing a new migration (append-only
policy — existing migrations may never be modified).

**Probability:** Medium — pricing decisions for a new category are typically finalized late.

**Impact:** Low — an UPDATE migration is simple and safe. But it adds operational overhead
and a second deployment cycle for Sprint 1.

**Mitigation:** Obtain explicit written confirmation of all five service prices from the
business owner BEFORE writing the migration. Do not proceed to implementation until this
confirmation exists.

---

### Risk 3 — Services Dashboard Cross-Contamination

**Risk:** Sprint 1 inserts 5 cleaning services into the `services` table. The
`app/[locale]/dashboard/diensten/page.tsx` `getServicesData()` function fetches ALL active
services without category filtering. Any currently active massage provider who visits
`/dashboard/diensten` after Sprint 1 deploys will see cleaning services listed alongside
massage services.

**Probability:** High — the query is definitely unfiltered; the contamination will
definitely occur.

**Impact:** Low for Sprint 1 — no active massage providers exist in production yet (all
cities `publicVisible: false`, no live customer bookings). The contamination is visible in
the dashboard UI but causes no booking harm.

**Impact:** High for Sprint 3 — if this debt is not resolved before cleaning provider
onboarding, a cleaning partner could accidentally enable a massage service (or a massage
provider could enable cleaning services), leading to incorrect booking availability.

**Mitigation:** Accept for Sprint 1. Log as a Sprint 2/3 hard blocker. The fix is a
category-scoped query in `getServicesData()`, which is a Low complexity change that
belongs to Sprint 2 (Cleaning Category) or Sprint 3 (Partner Portal).

---

### Risk 4 — i18n Copy Deployed Without Message File Updates

**Risk:** The `lib/cities.ts` change is deployed (Groningen added) but `messages/nl.json`
and `messages/en.json` are not updated in the same deployment. The city dropdown shows
Groningen, but the helper text below it (`applyCityHelper`) still reads "We evalueren
momenteel Utrecht, Amsterdam, Rotterdam en Den Haag." A Groningen applicant sees a
contradiction — the dropdown accepts them, the copy excludes them.

**Probability:** Low if PRs are reviewed; Medium if changes are split across PRs.

**Impact:** Low — confusing UX, but applications still save correctly. No data loss.

**Mitigation:** All four files (`lib/cities.ts`, migration, `messages/nl.json`,
`messages/en.json`) must ship in the same PR and the same production deployment.

---

### Risk 5 — Migration Run Against Wrong Supabase Instance

**Risk:** Developer runs the migration against staging Supabase (or a local branch) but
believes it ran against production. The production database still has the 4-city CHECK
constraint. When production code (with Groningen in cities.ts) deploys, production
Groningen applications fail silently.

**Probability:** Low — requires developer error.

**Impact:** High — silent data loss: submitted applications appear to succeed (honeypot
check passes, action returns `error: null`) but the Supabase INSERT fails and the catch
block returns `{ error: 'server' }` which the form displays as a generic server error.
Real Groningen applications would be lost.

**Mitigation:** After applying the migration, verify in the Supabase production dashboard
that `providers_city_slug_check` contains `groningen`. This is a 60-second manual
verification step that eliminates this risk entirely.

---

## Sprint Readiness Verdict

### Is Sprint 1 ready to implement?

**Not yet.** One blocking assumption must be validated first.

### Blockers

**Blocker 1 — Cleaning service prices unconfirmed:**
The migration cannot be written without confirmed `base_price_cents` values for all five
cleaning service rows. Writing the migration with placeholder prices and correcting later
adds operational risk and a second deployment cycle. This must be resolved before a single
line of migration SQL is authored.

No other hard blockers exist.

### Assumptions That Must Be Validated Before Implementation

| Assumption | How to validate |
|---|---|
| Five cleaning service types are correct | Business owner sign-off on service names (NL + EN), durations, and prices |
| `sort_order = 2` for cleaning category is correct | Confirm with business owner (massage is order 1; cleaning should follow) |
| Service descriptions are not needed at launch | Confirm whether `description_nl` / `description_en` must be seeded in Sprint 1 or can be added in Sprint 2 |
| Deployment order for this migration is MIGRATION FIRST | Dev lead must acknowledge the ADR-0001 exception documented above |

### Changes That Must Explicitly Be Deferred to Sprint 2 or Later

| Change | Reason for Deferral |
|---|---|
| Filtering `dashboard/diensten` services by category | No cleaning providers exist in Sprint 1; debt is acceptable |
| `voor-masseurs/page.tsx` Utrecht/massage-only copy | Cleaning partners get their own page in Sprint 3 |
| `lib/types/marketplace.ts` comment update | Non-blocking doc debt |
| `app/sitemap.ts` Groningen URLs | Groningen is not public; sitemap update is Sprint 8 |
| Any public-facing Groningen pages | Sprint 8 (after city is `publicVisible: true`) |
| Cleaning-specific booking UI (property type selector) | Sprint 2 / Sprint 4 |
| `aanbod/[slug]/page.tsx` hardcoded "Utrecht" in title | Known pre-existing debt; fix in Sprint 8 before multi-city launch |

---

## Sprint 1 Change Summary

```
FILES TO CREATE:  1
FILES TO MODIFY:  3
FILES TO DELETE:  0
MIGRATIONS:       1 (additive only)
RLS CHANGES:      0
BOOKING CHANGES:  0
PAYMENT CHANGES:  0
AUTH CHANGES:     0
```

| File | Change Type | Complexity | Risk | Architecture Impact |
|---|---|---|---|---|
| `supabase/migrations/[new].sql` | New migration (schema extension + seed) | Low | Medium | None |
| `lib/cities.ts` | Add config entry | Low | Low | None |
| `messages/nl.json` | Copy update (2 strings) | Low | Low | None |
| `messages/en.json` | Copy update (2 strings) | Low | Low | None |

**No file in Sprint 1 has Moderate or Major architecture impact.** The sprint is correctly
scoped. The existing generic marketplace architecture handles the Groningen + Cleaning
expansion almost entirely without code changes.

---

*Audit complete. Implementation must not begin until service prices are confirmed by the
business owner and the deployment order exception is acknowledged by the development lead.*
