# Development Roadmap

## Guiding Principle

Each phase must be working and testable before the next begins. No parallel phase development. No skipping.

---

## Phase 1 — Foundation

**Goal:** Project is running locally and deployable to Vercel with correct configuration.

### Deliverables
- [ ] Next.js 14+ App Router project with TypeScript strict mode
- [ ] Tailwind CSS + shadcn/ui configured
- [ ] next-intl configured with `nl` (default) and `en` locales
- [ ] Environment variable structure documented
- [ ] Vercel project created and connected to repo
- [ ] Basic folder structure following App Router conventions
- [ ] `.env.local.example` with all required keys listed

### Acceptance Criteria
- `npm run dev` starts without errors
- `npm run build` completes without errors
- Dutch locale renders at `/` and English at `/en`
- Deployed preview URL on Vercel works

---

## Phase 2 — Database & Auth

**Goal:** Supabase schema is live, Auth works, and RLS policies protect data.

### Deliverables
- [ ] Supabase project created
- [ ] Database schema: `providers`, `customers`, `services`, `service_categories`, `provider_services`, `bookings`, `payments`, `reviews`
- [ ] Row Level Security policies for all tables
- [ ] Supabase Auth configured (email + Google OAuth)
- [ ] Supabase client utility in `/lib/supabase`
- [ ] Auth middleware protecting dashboard routes
- [ ] Basic seed data: 1–2 test providers, service categories, services

### Acceptance Criteria
- Customer can register and log in
- Provider can register and log in
- Each role can only access their own data (RLS verified)
- Seed data visible in Supabase dashboard

---

## Phase 3 — Public Website

**Goal:** A real visitor can discover providers and understand the platform.

### Deliverables
- [ ] Homepage (hero, value prop, how it works, CTA)
- [ ] Provider listing page with filters
- [ ] Provider profile page (photo, bio, services, reviews)
- [ ] Service detail pages
- [ ] Static pages: How it works, For providers, FAQ, About, Contact
- [ ] SEO metadata (Dutch primary)
- [ ] Google Maps address display on provider profiles

### Acceptance Criteria
- All pages render in Dutch and English
- Provider listing page shows seed providers
- Provider profile shows services and pricing
- Mobile-responsive on all pages
- Lighthouse score > 80 on mobile

---

## Phase 4 — Booking Engine

**Goal:** A customer can complete a booking end-to-end (without payment).

### Deliverables
- [ ] Booking flow: select service → select provider → pick date/time → enter address → confirm
- [ ] Google Maps Places API integration for address input
- [ ] Provider availability calendar (weekly schedule)
- [ ] Real-time slot availability check
- [ ] Booking confirmation screen
- [ ] Booking confirmation email (customer + provider)
- [ ] Customer booking history page

### Acceptance Criteria
- Customer completes booking in under 3 minutes
- Conflicting slots are blocked
- Both customer and provider receive confirmation email
- Booking appears in customer account under "My Bookings"

---

## Phase 5 — Payments

**Goal:** Bookings require real Stripe payment. Providers receive payouts.

### Deliverables
- [ ] Stripe integration (customer payment at booking)
- [ ] Stripe Connect onboarding for providers
- [ ] Platform commission deducted automatically
- [ ] Provider payout triggered after booking completion
- [ ] Payment status reflected in booking record
- [ ] Receipt email to customer

### Acceptance Criteria
- Test payment succeeds in Stripe test mode
- Provider Stripe Connect account receives correct payout amount
- Failed payment blocks booking
- Refund flow works (manual for MVP)

---

## Phase 6 — Provider Dashboard

**Goal:** Providers can manage their business from a dashboard.

### Deliverables
- [ ] Provider onboarding flow (profile, services, availability, Stripe Connect)
- [ ] Dashboard: upcoming bookings, recent bookings
- [ ] Booking detail view (accept/decline for MVP)
- [ ] Availability management (weekly schedule + blocked dates)
- [ ] Service management (add, edit, pause services)
- [ ] Earnings overview (paid, pending)
- [ ] Profile editing

### Acceptance Criteria
- Provider completes onboarding in under 10 minutes
- Provider can update availability and it reflects in booking flow
- Provider sees correct earning totals

---

## Phase 7 — Admin Dashboard

**Goal:** Admin can manage the platform without direct database access.

### Deliverables
- [ ] Admin login (separate role via Supabase)
- [ ] User management (view all customers and providers)
- [ ] Provider approval workflow
- [ ] Booking overview with status management
- [ ] Basic analytics: bookings per day, revenue per week
- [ ] Manual payout trigger if needed

### Acceptance Criteria
- Admin can approve a new provider
- Admin can view all bookings and their statuses
- Admin cannot be impersonated by regular users (RLS)

---

## Phase 8 — Optimization & Launch

**Goal:** Platform is ready for real users in Utrecht.

### Deliverables
- [ ] Performance audit (Lighthouse > 90 on desktop, > 80 on mobile)
- [ ] Error monitoring (Sentry or equivalent)
- [ ] Critical path test coverage
- [ ] PWA manifest and service worker
- [ ] Cookie consent (GDPR — required in NL)
- [ ] Privacy policy and terms of service (Dutch)
- [ ] Analytics (privacy-first: Plausible or equivalent)
- [ ] Load test with simulated concurrent bookings
- [ ] Provider launch communication

### Acceptance Criteria
- End-to-end booking works with real Stripe (live mode)
- GDPR compliance checked by a human
- At least 3 real providers onboarded in Utrecht
- First real booking completed

---

## Post-MVP Backlog (Do Not Build Now)

- City expansion (Amsterdam, Rotterdam)
- New service categories
- In-app messaging
- Native mobile apps
- AI matching
- Subscription plans
- Advanced analytics
