# MVP Scope — Phase 1

## MVP Definition

**One city. One category. Real bookings. Real validation.**

| Constraint | Value |
|---|---|
| City | Utrecht, Netherlands |
| Category | Premium mobile massage / wellness |
| Platform | Website + PWA |
| Language | Dutch (primary), English (secondary) |
| Launch target | First real paid booking in Utrecht |

---

## In Scope

### Public Website
- Homepage with city and category context (Utrecht, massage)
- Provider listing page with filters (service type, availability, price range)
- Individual provider profile pages
- Service detail pages
- Static pages: About, How it works, For providers, FAQ, Contact
- SEO-optimized with Dutch metadata

### Booking Flow
- Address input via Google Maps Places API
- Date and time picker
- Service and provider selection
- Customer account creation or login (Supabase Auth)
- Booking summary and confirmation
- Stripe payment (card only for MVP)
- Booking confirmation email to customer and provider

### Customer Account
- Registration and login (email + Google OAuth)
- Booking history
- Review submission (post-service)
- Basic profile settings

### Provider Account
- Registration and onboarding flow
- Profile: photo, bio, certifications, service area
- Service catalog: service name, description, duration, pricing
- Availability calendar (weekly schedule + exceptions)
- Booking management (accept, view, complete)
- Basic earnings overview (total paid out, pending)
- Stripe Connect for payouts

### Admin Dashboard
- User management (customers and providers)
- Booking overview
- Manual booking status management
- Provider approval/verification
- Basic analytics (bookings per day, revenue)

### Technical Foundation
- Next.js 14+ App Router, TypeScript strict mode
- Supabase PostgreSQL with generic schema
- Supabase Auth with RLS policies
- Stripe payment + Stripe Connect payouts
- next-intl for Dutch/English i18n
- Tailwind CSS + shadcn/ui
- Vercel deployment with preview URLs
- Environment-based config (no secrets in code)

---

## Explicitly Out of Scope for MVP

These are not bugs or missing features. They are intentional deferrals.

| Feature | When |
|---|---|
| Native iOS / Android app | Phase 3+ |
| Amsterdam, Rotterdam, etc. | Phase 2 |
| Cleaning, tutoring, other categories | Phase 2+ |
| In-app messaging | Phase 2 |
| AI matching / recommendations | Phase 3+ |
| Subscription plans | Phase 2+ |
| Gift cards | Phase 2 |
| Referral program | Phase 2 |
| Corporate / B2B accounts | Phase 3+ |
| Dynamic pricing | Phase 3+ |
| Multi-provider bundles | Phase 3+ |
| Advanced provider analytics | Phase 2 |
| Waitlists | Phase 2 |
| National search | Phase 2 |

---

## Validation Criteria

The MVP is complete when:

1. A real customer in Utrecht can find a massage provider
2. Book a specific date, time, and address
3. Pay via Stripe
4. Receive confirmation
5. The provider receives a booking notification and payout
6. The customer can leave a review after the service

If all six steps work end-to-end with real data, the MVP is done.

---

## MVP Non-Goals

- Perfect UI polish (good enough is enough)
- Automated provider vetting (manual approval is fine)
- Full admin automation (manual processes are acceptable)
- 100% test coverage (critical paths only)
- Zero technical debt (pragmatic shortcuts are acceptable if documented)
