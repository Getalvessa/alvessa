# Deployment / Vercel / Production Readiness Task Template

> Use this template for any task touching: Vercel config, environment variables, build verification, migration deployment, or production readiness checks.

---

## Step 0 — Required Reading

```
Read docs/PROJECT_MAP.md — overview (no subsystem-specific reading required)
```

---

## Scope Declaration

```
TASK TYPE: [env check / build fix / migration deploy / production readiness]
TASK: [one sentence]
PRODUCTION IMPACT: [what this affects in production]
```

---

## Deployment Checklist

Run through this checklist before any production deployment:

### Build
- [ ] `npm run lint` — 0 errors (warnings acceptable if pre-existing)
- [ ] `npm run build` — success, all pages generated
- [ ] No TypeScript errors (strict mode)

### Environment Variables
Verify these are set in Vercel (never put values in code):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          ← server-only, never expose to client
STRIPE_SECRET_KEY                  ← server-only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
BASIC_AUTH_PASSWORD                ← required while site is behind Basic Auth
```
Check: `vercel env ls` — verify all are present for `production` environment.

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is present in Vercel Production (booking INSERT and availability queries depend on it)
- [ ] `BASIC_AUTH_PASSWORD` is present in Vercel Production while the site is behind Basic Auth (remove this check only after Basic Auth is removed)

### Database Migrations
- [ ] `supabase db push` applied all pending migrations
- [ ] Verify with: `supabase migration list` — all migrations show as applied
- [ ] Current migration count: 15 files (as of 2026-05-27)
- [ ] No pending migrations in `supabase/migrations/` that are not yet applied

### Stripe
- [ ] Stripe is in **test mode** until explicitly approved for live mode in writing
- [ ] Webhook endpoint registered in Stripe dashboard pointing to production URL
- [ ] `STRIPE_WEBHOOK_SECRET` matches the registered webhook's signing secret
- [ ] **Public launch is blocked** until all three are verified in production:
  - Bank account connected and payouts enabled in Stripe dashboard
  - Webhook receiving and processing `payment_intent.succeeded` events correctly
  - End-to-end payment flow tested: checkout → payment → booking confirmed → provider notified

### RLS
- [ ] All tables have RLS enabled
- [ ] No policy accidentally exposes rows across users
- [ ] `bookings` table: authenticated INSERT policy is intentionally absent (do not re-add it)

### Auth / Middleware
- [ ] `proxy.ts` middleware protects `/dashboard/*` and `/admin/*`
- [ ] Supabase Auth redirect URLs are set for production domain

---

## Forbidden Actions During Deployment

```
NEVER run: supabase db reset (destroys all data)
NEVER force-push to main (--force)
NEVER commit .env or .env.local
NEVER commit .claude/settings.local.json (contains local tool permissions)
NEVER change STRIPE_SECRET_KEY without updating Stripe dashboard webhook
NEVER deploy with a failing build
NEVER skip migration deployment before code deployment (migrations first)
NEVER launch publicly before Stripe bank/webhook/payment flow is verified
```

---

## Deployment Order (when migrations are involved)

1. `supabase db push` — apply migrations first
2. Verify migration applied: `supabase migration list`
3. `git push` — deploy code
4. Verify Vercel build succeeds
5. Smoke-test the affected feature in production

---

## Required Output

```
## Deployment Task Complete

TASK TYPE: [env check / build fix / migration deploy / production readiness]

BUILD STATUS:
- npm run lint: [✅ 0 errors / ❌]
- npm run build: [✅ success / ❌]

MIGRATION STATUS:
- Pending migrations applied: [Yes / No / N/A]
- Migration count: [N applied]

ENV VARS STATUS:
- All required vars present in Vercel production: [✅ / ❌ — list missing]
- SUPABASE_SERVICE_ROLE_KEY present: [✅ / ❌]
- BASIC_AUTH_PASSWORD present (if site behind Basic Auth): [✅ / ❌ / N/A]

STRIPE MODE: [test / live — only live if explicitly approved]

STRIPE LAUNCH BLOCKERS (must all be ✅ before public launch):
- Bank account connected and payouts enabled: [✅ / ❌ / not checked]
- Webhook verified end-to-end in production: [✅ / ❌ / not checked]
- Payment flow tested (checkout → confirmed booking): [✅ / ❌ / not checked]

SENSITIVE FILES CHECK:
- .env.local not committed: [✅ / ❌]
- .claude/settings.local.json not committed: [✅ / ❌]

PRODUCTION SAFE: [✅ Yes / ❌ No — explain blocker]

NEXT: [one sentence]
```
