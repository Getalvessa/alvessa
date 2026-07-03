# Current Sprint

> Describes ONLY the active sprint. Replace the entire content when the next sprint starts — this is not an archive.

## Sprint

**RC-4 — Production Deployment Verification (SOFT LAUNCH / FULL HIDDEN)** (2026-07-03) — **completed**
Type: Release engineering only. No code, SEO, Stripe, database or config changes.

## Objective

Deploy `release/rc-3` to Vercel Production WITHOUT flipping any launch switch: FULL HIDDEN stays active, Stripe stays test mode, Groningen stays `publicVisible: false`.

## Completed

- Verified all 10 production env vars present in Vercel (names only, values not exported): Supabase (URL/anon/service_role), Stripe (publishable/secret/webhook), Resend + EMAIL_FROM, ADMIN_EMAIL, NEXT_PUBLIC_SITE_URL
- Deployed `release/rc-3` (commit `8bc3d2b`) via `vercel deploy --prod` — deployment `alvessa-6rcqh2nuv` Ready, aliased to https://alvessa.nl, https://www.alvessa.nl
- Production verification passed: all public pages 200 + `noindex, follow`; `/dashboard` `/admin` 307 → `/inloggen`; robots.txt allows public crawl + disallows private paths; sitemap.xml empty urlset; manifest + OG image (image/png) correct; 404 works; NL/EN both render; canonical `https://alvessa.nl` + hreflang nl/en/x-default
- No launch switches flipped (SEO, Stripe Live, publicVisible all unchanged)

## Blocked

- Nothing

## Acceptance Criteria

- Production live on alvessa.nl with FULL HIDDEN intact — done
- No repository changes beyond docs — done

## Next Task

Real launch checklist (dedicated tasks, owner approval each): Groningen `publicVisible` flip → provider onboarding → Stripe Live (written approval) → phased SEO release (fix Open Debt #6 html `lang` first) → restore sitemap.
