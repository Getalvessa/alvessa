# Decision Log

Decisions that shaped the product direction. Each entry explains what was decided, why, and what was rejected.

---

## Template

```
## [DATE] — [Decision Title]
**Decision:** ...
**Reasoning:** ...
**Rejected alternatives:** ...
**Consequences:** ...
```

---

## 2026-05-11 — Utrecht-First, Dutch-First, Massage-Only MVP

**Decision:**
Launch the platform as a single-city (Utrecht), single-category (premium mobile massage/wellness), Dutch-language-first PWA. The tech stack will use generic marketplace naming internally, but the public-facing product will only expose massage for Phase 1.

**Reasoning:**
- Utrecht is a dense mid-size Dutch city with high income levels and a strong wellness culture — a realistic first market
- Massage is a high-value, appointment-driven service with natural marketplace dynamics (trust, availability, pricing)
- Single city + single category = the fastest path to real bookings, real feedback, and real revenue
- Dutch-first because the target customer speaks Dutch; English adds trust for international providers
- Generic backend naming prevents technical debt when adding categories in Phase 2

**Rejected alternatives:**
- **National launch from day one**: Too thin. A marketplace needs density to be useful. Better to be the best option in Utrecht than a mediocre option nationally.
- **Multi-category from day one**: Too complex. Each category has different pricing, duration, and provider onboarding needs. Adding category-specific logic before the core booking flow is proven is premature.
- **Native mobile app**: Too expensive and slow for an MVP. PWA covers the installable experience. A native app can follow once the product is validated.
- **English-only**: Excludes the majority of the Dutch target audience at launch. Dutch-first with next-intl from day one is the correct call.
- **AI-powered matching**: Interesting but not needed to get to first booking. Algorithmic matching adds complexity without validated demand.

**Consequences:**
- The frontend will use massage-specific copy (Dutch: "massageprovider", "massageservice") while the database uses `providers`, `services`, etc.
- Expanding to a second city or category will require no schema migration — only new seed data and frontend routing
- Team must resist feature creep. Any feature not serving "first booking in Utrecht" is deferred.

---

## 2026-05-11 — Generic Marketplace Schema from Day One

**Decision:**
All database tables and API endpoints use generic marketplace naming, not massage-specific naming.

**Reasoning:**
Hardcoding "massage" into the schema would require a disruptive migration when adding cleaning or tutoring in Phase 2. The cost of using generic names now is zero. The cost of migrating later is high.

**Rejected alternatives:**
- Massage-specific schema now, migrate later: Rejected because migrations on a live database with real bookings are risky and time-consuming.

**Consequences:**
- Schema: `providers`, `customers`, `services`, `service_categories`, `provider_services`, `bookings`, `payments`, `reviews`
- The `service_categories` table will have a `slug` column (e.g., `massage`, `cleaning`) used for frontend routing and filtering
- New developers must be briefed: "the database is generic, the frontend is massage-only for now"

---

## 2026-05-12 — Next.js 16.2.6 Adopted (Originally Planned as 14+)

**Decision:**
Accept Next.js 16.2.6 as the runtime framework, adapting to its breaking changes rather than downgrading to 14.

**Reasoning:**
- The project was scaffolded with Next.js 16.2.6 — downgrading would be unnecessary churn
- 16.2.6 satisfies the "14+" requirement stated in CLAUDE.md (16 ≥ 14)
- Next.js 16 brings Turbopack stable, React 19.2, and a cleaner `proxy.ts` convention — all net positives
- `npm run build` and `npm run type-check` both pass with zero errors on 16.2.6

**Breaking changes encountered and resolved:**

| Change | Resolution |
|---|---|
| `middleware.ts` renamed to `proxy.ts` | Created `proxy.ts` with named `proxy` export |
| `params` must be `await`ed | All layouts and pages use `async/await` for params |
| Turbopack enabled by default | No custom webpack config — no conflict |
| React 19.2 required | `next-intl` 4.11.2 explicitly supports React 19 |

**Rejected alternatives:**
- Downgrade to Next.js 14: Unnecessary, creates more migration work later, loses performance improvements

**Consequences:**
- All future development must use `proxy.ts` instead of `middleware.ts`
- All `params` / `searchParams` / `cookies` / `headers` must be awaited
- CLAUDE.md's "Next.js 14+ App Router" reference remains valid — 16 is a superset

---

## 2026-05-11 — Supabase + Stripe as Core Infrastructure

**Decision:**
Use Supabase for database, auth, and storage. Use Stripe for payments and Stripe Connect for provider payouts.

**Reasoning:**
- Supabase provides PostgreSQL with Row Level Security, built-in Auth, and a generous free tier — appropriate for an MVP
- Stripe is the industry standard for marketplace payments with split payouts; Stripe Connect directly solves the provider payout problem without building a custom solution
- Both integrate well with Next.js and Vercel

**Rejected alternatives:**
- Self-hosted PostgreSQL: More ops burden, unnecessary for MVP scale
- Firebase: Less SQL control, harder to enforce RLS at the row level
- Manual payouts (bank transfers): Not scalable, legally complex in NL, bad provider experience

**Consequences:**
- Provider onboarding includes a Stripe Connect step
- Platform commission is automatically deducted via Stripe's application fee parameter
- Supabase RLS must be carefully designed — all tables need policies for customer, provider, and admin roles
