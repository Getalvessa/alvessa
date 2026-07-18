# Current Sprint

> Describes ONLY the active sprint. Replace the entire content when the next sprint starts — this is not an archive.

## Sprint

**Utrecht Massage Recruitment Mode** (2026-07-16/18) — **release-committed-awaiting-production-approval**
Type: Public narrative + navigation + FAQ/About/Contact + historical SEO landing alignment + html lang + **Mobile Header Logo + Login + Recruitment CTA** + EN consistency. **No city visibility flip. No Stripe/SEO/DB/env changes in this step.**

## Objective

Switch the public website to **Utrecht Massage Recruitment Mode**: recruit founding massage therapists in Utrecht; keep customer bookings closed; preserve Groningen code and data; keep FULL HIDDEN SEO; align historical Utrecht massage landings; emit correct `<html lang>`; ensure mobile Header exposes Login and a recruitment CTA without a hamburger menu.

## Completed

- Homepage, root metadata, JSON-LD → Utrecht massage recruitment narrative
- Header/Footer provider CTA → `/voor-masseurs`
- `/aanbod` empty state → coming soon + masseurs CTA
- nl/en messages for home, nav, providers, howItWorks, footer, meta, forProviders, FAQ/About/Contact
- `/voor-masseurs/aanmelden` pins `defaultCity="utrecht"` + `categorySlug="massage"`
- Historical landings (`massage-aan-huis-utrecht`, `deep-tissue-massage-utrecht`, `hotel-massage-utrecht`, `sportmassage-utrecht`): recruitment copy, CTA → `/voor-masseurs`, Offer/priceRange removed from JSON-LD, noindex kept
- Sole `<html lang="{locale}">` in `app/[locale]/layout.tsx` (root layout returns children only; SSG retained)
- `lib/cities.ts` **unchanged**
- Preview Supabase public vars already present — **not** modified in this sprint
- EN consistency: `Utrecht, Netherlands`; contact/footer `Chamber of Commerce (KvK) number`; `forProviders.metaTitle` → `For therapists — Alvessa`
- **Mobile Header:** Logo + Login + Recruitment CTA below `md` — NL `Inloggen` + `Aanmelden` → `/voor-masseurs`; EN `Log in` + `Apply` → `/en/voor-masseurs`; **Register desktop-only**; **no hamburger / Drawer / Sheet / menu state**
- Desktop: nav + Login + Register visible; mobile-only Aanmelden/Apply hidden (`md:hidden`)
- Local mobile (320/360/390) + desktop (1440×900) visual QA PASS
- Preview `dpl_9S3GZmNyRXEjGv4p6tENxf8qdakC` final visual QA PASS; Share restored to Only people with access
- lint / type-check / build PASS
- Local release commit created — **Production deploy not authorized in this sprint**

## Blocked / deferred

- Production Deployment Approval Gate (founder) — push/deploy/promote not started
- Utrecht Supply Gate — no real booked-ready Utrecht massage provider yet
- Customer booking activation — not opened
- Stripe Live / SEO release — not opened
- Rewrite of `docs/GA_RELEASE_CHECKLIST.md` + `docs/SMOKE_TEST_RUNBOOK.md` (still old Groningen Booking GA; left untracked, excluded from this commit)
- `/voor-schoonmakers*` retention vs active cleaning recruitment — PRODUCT DECISION REQUIRED

## Acceptance Criteria

- Public main narrative = Utrecht massage recruitment — done
- Historical landings do not claim immediate booking — done
- No false Offer JSON-LD on landings — done
- NL/EN `<html lang>` correct — done
- Utrecht not `publicVisible` — done (untouched)
- noindex + empty sitemap preserved — done (untouched)
- Stripe/webhook/env untouched this step — done
- Mobile Header Logo + Login + Recruitment CTA (no hamburger; Register desktop-only) — done (local + Preview QA)
- Local release commit — done; Production approval — pending

## Next Task

**Production Deployment Approval Gate** against the exact release commit SHA. No Production deploy until founder approval.
