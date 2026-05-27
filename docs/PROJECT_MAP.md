# Project Map — Alvessa Marketplace

> One-sentence summary: A Dutch-first home services marketplace (Utrecht, mobile massage MVP) built on Next.js App Router + Supabase + Stripe + Vercel.

---

## Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Framework  | Next.js 14+ App Router      |
| Language   | TypeScript (strict)         |
| Styling    | Tailwind CSS + shadcn/ui    |
| Database   | Supabase (PostgreSQL + RLS) |
| Auth       | Supabase Auth               |
| Payments   | Stripe Checkout + Webhooks  |
| i18n       | next-intl (NL primary / EN) |
| Deployment | Vercel                      |

---

## Subsystem Map

### A. Booking / Payment  🔴 HIGH RISK — read STABLE_MODULES.md before touching

| File | Role |
|------|------|
| `app/[locale]/aanbod/[slug]/boeken/actions.ts` | Server action: validates slot, creates booking via service_role, creates Stripe session |
| `app/[locale]/aanbod/[slug]/boeken/booking-flow.tsx` | 4-step booking UI (service → date → address → confirm) |
| `app/[locale]/aanbod/[slug]/boeken/page.tsx` | Page wrapper for booking flow |
| `app/api/availability/route.ts` | GET handler: returns available time slots for a provider/date |
| `app/api/stripe/webhook/route.ts` | POST handler: Stripe webhook → confirms booking on payment success |
| `app/[locale]/boeken/succes/page.tsx` | Post-checkout success page |
| `app/[locale]/mijn-boekingen/page.tsx` | Customer "my bookings" list page |

---

### B. Security / Auth / RLS  🔴 HIGH RISK — never touch without dedicated task + review

| File | Role |
|------|------|
| `proxy.ts` (middleware) | Route-level auth guard: protects /dashboard, /admin, /boeken |
| `lib/supabase/server.ts` | `createClient()` (user-scoped, respects RLS) + `createServiceRoleClient()` (bypasses RLS) |
| `lib/supabase/client.ts` | Browser-side Supabase client |
| `supabase/migrations/202605120006_rls_policies.sql` | Base RLS policies |
| `supabase/migrations/202605120008_security_fixes.sql` | Security hardening batch |
| `supabase/migrations/202605270001_bookings_update_rls.sql` | Booking UPDATE RLS (field-tampering trigger) |
| `supabase/migrations/202605270002_bookings_insert_and_confirm_rls.sql` | Drops authenticated INSERT; blocks provider confirm-bypass |

Full migration list: `supabase/migrations/` (15 files, chronological)

---

### C. i18n / Copy / Legal  🟡 MEDIUM RISK — only touch messages/* and legal pages

| File | Role |
|------|------|
| `messages/nl.json` | All Dutch customer-facing strings (primary language) |
| `messages/en.json` | All English strings (secondary) |
| `app/[locale]/privacybeleid/page.tsx` | Privacy policy page |
| `app/[locale]/algemene-voorwaarden/page.tsx` | Terms & conditions page |
| `app/[locale]/faq/page.tsx` | FAQ page |
| `components/layout/cookie-banner.tsx` | GDPR cookie consent banner |

---

### D. Provider Dashboard  🟢 LOW RISK (self-contained, provider-only routes)

| File | Role |
|------|------|
| `app/[locale]/dashboard/layout.tsx` | Dashboard shell + sidebar |
| `app/[locale]/dashboard/page.tsx` | Overview / stats |
| `app/[locale]/dashboard/boekingen/page.tsx` | Provider booking list + status update |
| `app/[locale]/dashboard/beschikbaarheid/page.tsx` | Weekly schedule + exceptions |
| `app/[locale]/dashboard/beschikbaarheid/availability-form.tsx` | Availability form component |
| `app/[locale]/dashboard/diensten/page.tsx` | Provider services config |
| `app/[locale]/dashboard/diensten/services-form.tsx` | Services form component |
| `app/[locale]/dashboard/dienstvorm/page.tsx` | Service mode (at_home / at_salon) config |
| `app/[locale]/dashboard/dienstvorm/service-mode-form.tsx` | Service mode form component |
| `app/[locale]/dashboard/profiel/page.tsx` | Provider profile editor |
| `app/[locale]/dashboard/profiel/profile-form.tsx` | Profile form component |
| `app/[locale]/dashboard/inkomsten/page.tsx` | Earnings summary |
| `components/dashboard/sidebar.tsx` | Dashboard nav sidebar |
| `components/dashboard/stats-card.tsx` | Reusable stats card |

---

### E. Admin  🟡 MEDIUM RISK (platform management, no payment mutations)

| File | Role |
|------|------|
| `app/[locale]/admin/layout.tsx` | Admin shell + sidebar |
| `app/[locale]/admin/page.tsx` | Admin overview |
| `app/[locale]/admin/boekingen/page.tsx` | All bookings view |
| `app/[locale]/admin/boekingen/bookings-table.tsx` | Booking table + admin actions |
| `app/[locale]/admin/aanbieders/page.tsx` | Provider management |
| `app/[locale]/admin/aanbieders/providers-table.tsx` | Provider table component |
| `app/[locale]/admin/gebruikers/page.tsx` | User management |
| `components/admin/admin-sidebar.tsx` | Admin nav sidebar |

---

### F. Public Marketing Pages  🟢 LOW RISK (read-only, no mutations)

| File | Role |
|------|------|
| `app/[locale]/page.tsx` | Homepage |
| `app/[locale]/aanbod/page.tsx` | Provider listing / browse |
| `app/[locale]/aanbod/[slug]/page.tsx` | Individual provider profile |
| `app/[locale]/over-ons/page.tsx` | About page |
| `app/[locale]/hoe-het-werkt/page.tsx` | How it works page |
| `app/[locale]/voor-masseurs/page.tsx` | For providers landing page |
| `app/[locale]/contact/page.tsx` | Contact page |
| `app/[locale]/massage-aan-huis-utrecht/page.tsx` | SEO landing: home massage |
| `app/[locale]/sportmassage-utrecht/page.tsx` | SEO landing: sports massage |
| `app/[locale]/deep-tissue-massage-utrecht/page.tsx` | SEO landing: deep tissue |
| `app/[locale]/hotel-massage-utrecht/page.tsx` | SEO landing: hotel massage |
| `components/layout/site-header.tsx` | Global nav header |
| `components/layout/site-footer.tsx` | Global footer |
| `components/providers/provider-card.tsx` | Provider listing card |
| `components/seo/json-ld.tsx` | Structured data component |

---

## Current Module Status

| Module | Status | Notes |
|--------|--------|-------|
| Auth (login/register/OAuth) | ✅ Stable | Supabase Auth |
| Booking flow (4-step) | ✅ Stable | service_role INSERT, Stripe Checkout |
| Payment (Stripe Checkout) | ✅ Stable | webhook confirms booking |
| Availability API | ✅ Stable | 30-min slots, UTC+2 fixed |
| Provider dashboard | ✅ Stable | bookings, schedule, services, earnings |
| Admin dashboard | ✅ Stable | users, bookings, providers |
| RLS security | ✅ Stable | 15 migrations applied |
| i18n (NL + EN) | ✅ Stable | next-intl, all strings in messages/ |
| SEO pages | ✅ Stable | 4 landing pages + JSON-LD |
| Self-service cancellation | ❌ Not built | Copy directs to hallo@alvessa.nl |
| Timezone (winter CET) | ⚠️ Phase 8 | TZ_OFFSET_H=2 hardcoded (CEST only) |
