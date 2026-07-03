# Project State

> Single source of truth for operational state. Overwrite in place — never append history.
> Last updated: 2026-07-03 (Sprint RC-2C)

## Current Sprint

**Sprint RC-2C — Align Sitemap with FULL HIDDEN Strategy** — completed. See `docs/CURRENT_SPRINT.md`.

## Last Completed Sprint

**Sprint RC-2B** (2026-07-03) — FULL HIDDEN policy: all 8 remaining indexable public pages set to noindex. RC-1 rebrand (same day) pending owner review.

## Completed Work

- Utrecht massage marketplace foundation: auth, booking engine, Stripe Checkout + webhook, RLS (24 migrations), provider/admin dashboards, i18n, SEO, email (Resend) — all ✅ Stable (`docs/PROJECT_MAP.md` → Module Status)
- Groningen cleaning track: city + category migration (`202607010001`), cleaning services seeded, application form cleaning copy (Sprint 3.6), booking notes cleaning copy (Sprint 4)
- RC-1 rebrand (2026-07-03): all customer-visible copy/metadata/legal/SEO now Groningen cleaning; massage assets (SEO landings, `voor-masseurs`) retained noindex + unlinked; new `voor-schoonmakers/aanmelden` route
- City architecture with canonical slugs + visibility gating (ADR-0001); all cities `publicVisible: false`
- Category architecture (`lib/categories.ts`): typed `CategoryDefinition` / `CategoryCapabilities`, slug-based detection, commission config (Sprint 2.9; `docs/DECISION_LOG.md` 2026-07-02 entry)

## Open Debts

| # | Debt | Severity | Fix window |
|---|------|----------|------------|
| 1 | `StudioInfoStep` shows massage copy for hybrid+in_studio cleaning providers | 🟢 LOW | If cleaning studio mode ever ships |
| 2 | `TZ_OFFSET_H=2` hardcoded (CEST only) — breaks after October clock change | 🟡 MED | Before November |
| 3 | Self-service cancellation not built — copy routes to hello@alvessa.nl | 🟢 LOW | Sprint 8 or post-launch |
| 4 | `providers.profileMetaTitle/Description` message keys hardcode "Groningen" (currently unused by pages) | 🟢 LOW | Before multi-city public launch |
| 5 | Stripe webhook writes literal `payments.platform_fee_cents: 0` — must mirror `booking.platform_fee_cents` once a commission rate becomes nonzero | 🟢 LOW | Stripe Connect payouts sprint (rates are 0 today) |
| 6 | `<html>` has no `lang` attribute — root layout comment claims `[locale]/layout.tsx` sets it, but nothing does (a11y/SEO; harmless while noindex) | 🟡 MED | Before SEO index release (Phase 1) |

## Verified Facts

- Framework is **Next.js 16.2.6** (`proxy.ts` not `middleware.ts`; `params` must be awaited) — `docs/DECISION_LOG.md` 2026-05-12 entry
- Schema source of truth: `docs/SCHEMA_SNAPSHOT.md` (synced to migration 026)
- Bookings INSERT is service_role-only by design; no authenticated INSERT policy exists
- Category behaviour source of truth: `lib/categories.ts`. Booking flow + booking action resolve category via `service_categories.slug` (joined in `fetchProviderForBooking` and the booking action's `provider_services` query) — no service-name matching remains
- Commission rates are 0 for all categories — `platform_fee_cents` stays 0 until Stripe Connect payouts ship; changing a rate in `lib/categories.ts` is the activation switch
- Frozen rule (ARCHITECTURE_FREEZE #11, Sprint 3A): runtime category behaviour lives only in `lib/categories.ts`; `calculateCommissionCents()` is the sole commission entry point; Sprint 3A verification search found zero category-name/slug branching in source

## Pre-Launch SEO Strategy

> Owner decision, implemented 2026-07-03 (Sprint RC-2B).

**Current Mode: FULL HIDDEN.** Every customer-facing page carries `robots: index:false, follow:true` (via `lib/metadata.ts` `buildMetadata({ noindex: true })`). Private routes (`/dashboard`, `/admin`, `/mijn-boekingen`, booking flow, auth) keep their own stricter policy: `index:false, follow:false` + `app/robots.ts` disallow. `robots.ts` continues to ALLOW crawling of public pages so search engines can read the noindex tags — do not add public paths to disallow.

**Purpose:** Prevent premature indexing before launch.

**Release Conditions** (all required before any noindex removal):
- Groningen `publicVisible` enabled (`lib/cities.ts`, dedicated task)
- Stripe Live enabled (owner written approval per CLAUDE.md)
- First production providers available
- Founder approval (written)

**Who may remove noindex.** Only the founder may authorize removal, in writing, via a dedicated launch task. No agent may remove any noindex directive on its own initiative.

**Index release order after approval:**
- Phase 1: `/` (homepage)
- Phase 2: `/aanbod` (listing)
- Phase 3: `/aanbod/[slug]` (provider pages)
- Phase 4: remaining public pages (info + recruitment), if applicable

Each phase adds its URLs to `app/sitemap.ts` when its noindex is removed. Massage-track assets (4 Utrecht SEO landings, `/voor-masseurs(/aanmelden)`) stay noindex indefinitely until that track relaunches.

**Current sitemap policy (RC-2C):** `app/sitemap.ts` returns an empty array during FULL HIDDEN — the sitemap must not advertise pages that are intentionally noindex. Restore URLs together with the index release, in the same phased order: Phase 1 homepage → Phase 2 `/aanbod` listing → Phase 3 provider pages → Phase 4 supporting pages (the 8 info/recruitment URLs listed as a comment in `app/sitemap.ts`). All SEO signals are now consistent: all pages noindex, sitemap empty, robots.txt still allows crawling (so noindex tags stay readable), canonical/hreflang unchanged.

## Blocking Issues

None. Sprint 3A has no external blockers.

## Next Recommended Task

Owner review of RC-1; then launch checklist — flipping Groningen to `status: 'active'` + `publicVisible: true` in `lib/cities.ts` is the remaining launch switch (dedicated task).
