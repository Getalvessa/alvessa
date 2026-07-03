# Current Sprint

> Describes ONLY the active sprint. Replace the entire content when the next sprint starts — this is not an archive.

## Sprint

**RC-2C — Align Sitemap with FULL HIDDEN Strategy** (2026-07-03) — **completed**
Type: `app/sitemap.ts` only + documentation. No robots.ts, metadata, noindex, canonical, hreflang, booking, Stripe, DB or translation changes.

## Objective

Remove the last mixed SEO signal: the sitemap listed 8 URLs that are intentionally noindex under FULL HIDDEN (RC-2B). **The sitemap is intentionally empty before production launch.**

## Completed

- `app/sitemap.ts` now returns `[]` (Option A); the former 8 URLs kept as a comment for Phase 4 restoration
- `app/robots.ts` untouched — still allows crawling (required so noindex tags remain readable) and still references `sitemap.xml` (an empty sitemap is valid)
- Page metadata / noindex / canonical / hreflang untouched
- `docs/STATE.md` → Pre-Launch SEO Strategy updated with the sitemap policy (empty during FULL HIDDEN; restore per phased release: 1 homepage → 2 listing → 3 provider pages → 4 supporting pages)
- Validation: `npm run lint` 0 errors, `npm run build` success, `/sitemap.xml` renders an empty urlset

## Blocked

- Nothing

## Acceptance Criteria

- Sitemap empty; all SEO signals consistent (all pages noindex + empty sitemap + crawling allowed + canonical unchanged) — done
- Lint 0 errors, build success

## Next Task

Owner review of RC-1/RC-2A/RC-2B/RC-2C; then launch checklist (Groningen `publicVisible` flip + phased noindex/sitemap release per `docs/STATE.md`).
