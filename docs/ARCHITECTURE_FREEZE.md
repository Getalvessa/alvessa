# Architecture Freeze

Decisions recorded here are **locked**. Claude must not silently change, refactor around, or work against any item on this list without an explicit project owner decision and a new entry in `docs/DECISION_LOG.md`.

If a frozen decision conflicts with a task, **stop and raise it** — do not quietly choose a different approach.

---

## How to Use This File

When starting any implementation task, check this list.
If the task would violate a frozen decision: flag it before writing a single line of code.

---

## Frozen Decisions

### 1. i18n Routing Strategy

**Decision:** `next-intl` with `localePrefix: 'as-needed'`.

- Dutch (`nl`) is the default locale — no URL prefix (e.g. `/`, `/aanbieders`)
- English (`en`) has the `/en` prefix (e.g. `/en`, `/en/providers`)
- All routing uses the typed `Link`, `useRouter`, `redirect` exported from `@/i18n/navigation`
- No hardcoded locale strings in JSX — all text goes through `useTranslations` or `getTranslations`

**Do not:**
- Switch to a different i18n library
- Add a prefix to the Dutch locale
- Use Next.js's own i18n config (it is handled by next-intl)
- Hardcode Dutch strings in components

---

### 2. Generic Marketplace Naming

**Decision:** All database tables, API routes, and TypeScript types use generic marketplace naming. The frontend MVP exposes massage; the schema must not encode massage.

| Use | Never use |
|---|---|
| `providers` | `massage_therapists` |
| `customers` / `profiles` | `clients` |
| `services` | `massage_services` |
| `service_categories` | `massage_types` |
| `provider_services` | `therapist_offerings` |
| `bookings` | `massage_bookings` |
| `payments` | — |
| `reviews` | — |

**Do not:**
- Create a `massage_*` anything in the database, API, or TypeScript types
- Use domain-specific terminology in backend code that would require migration when adding a second category

---

### 3. No Pre-Generated Time Slots

**Decision:** Booking time slots are calculated dynamically in the application layer. There is no `time_slots` table or similar pre-generated structure in the database.

**Slot calculation algorithm:**
1. Load provider's `availability_schedules` for the requested day
2. Apply `availability_exceptions` (blocks or extensions)
3. Subtract time ranges occupied by `bookings` with `status = 'confirmed'`
4. Return remaining available windows

**Do not:**
- Create a `time_slots`, `available_slots`, or `slot_reservations` table
- Pre-generate or cache slots in the database
- Store "available" state — only store "booked" state

---

### 4. Utrecht-First Geographic Constraint

**Decision:** The MVP launches in Utrecht, Netherlands only. All geographic logic, provider onboarding, and customer-facing copy is locked to Utrecht until Phase 2B geographic expansion is explicitly approved.

**Concrete constraints:**
- `providers.city` defaults to `'Utrecht'` in seed data and onboarding forms
- Address validation is scoped to the Netherlands
- No city selector in the MVP booking flow
- No multi-city search, filtering, or routing

**Do not:**
- Add a city selector dropdown for customers
- Support providers outside Utrecht
- Build multi-city URL routing (e.g. `/amsterdam/masseurs`)

---

### 5. Dutch-First Language Strategy

**Decision:** Dutch is the primary language of the product. English is a secondary translation layer.

**Concrete constraints:**
- Default locale is `nl` (no URL prefix)
- All new i18n keys must be added to `messages/nl.json` first
- All SEO metadata (title, description, og:tags) renders Dutch by default
- Provider-facing copy is in Dutch
- Customer-facing copy is in Dutch

**Do not:**
- Add English keys without a Dutch equivalent
- Set English as the default locale
- Translate UI strings in code — always use `next-intl` keys

---

### 6. Modular Monolith Architecture

**Decision:** The project is a modular monolith deployed as a single Next.js application on Vercel. It is not a microservice architecture.

**Concrete constraints:**
- One Next.js app, one Supabase project, one Vercel deployment
- No separate backend API service
- No separate admin service
- No message queues, worker processes, or separate event buses for MVP
- Business logic lives in Next.js Server Actions and Route Handlers

**Do not:**
- Propose splitting into microservices
- Add Docker Compose, separate Express servers, or background job queues
- Create separate deployments for customer-facing vs admin-facing code

---

### 7. Next.js 16 `proxy.ts` Convention

**Decision:** Next.js 16.2.6 renames `middleware.ts` to `proxy.ts`. This project uses the new convention.

**Concrete constraints:**
- The file at the root is `proxy.ts` with a named `proxy` export
- Do not create `middleware.ts` — it is deprecated in Next.js 16
- All locale routing logic goes through `proxy.ts` via `next-intl`'s `createMiddleware`
- All `params`, `searchParams`, `cookies`, and `headers` must be `await`ed (Next.js 16 async Request APIs)

**Do not:**
- Create a `middleware.ts` file
- Use synchronous `params` access in layouts or pages
- Place routing logic outside of `proxy.ts`

---

### 8. Database: No Hard Deletes on Financial Records

**Decision:** `bookings` and `payments` records are never deleted. They are permanent audit trails.

**Concrete constraints:**
- `bookings`: Status-managed lifecycle. Never `DELETE`.
- `payments`: Append-only. Never `DELETE` or `UPDATE` completed payment amounts.
- Cancellations and refunds are represented as status changes and new fields (`refund_amount_cents`, `cancelled_at`), not deletions.

**Do not:**
- Add `DELETE` RLS policy to `bookings` or `payments`
- Create a "cleanup" script that deletes old bookings

---

### 9. Booking Snapshot Requirement

**Decision:** `bookings` must carry snapshot copies of service and provider data at the time of booking, because the source records can change over time.

**Required snapshot fields in `bookings`:**
- `service_name_nl_snapshot`
- `service_name_en_snapshot`
- `service_price_cents_snapshot`
- `provider_display_name_snapshot`
- `provider_slug_snapshot`
- `duration_minutes` (already a snapshot field by design)

**Do not:**
- Remove snapshot fields to "normalize" the schema
- Join to `services` or `providers` to reconstruct booking history details

---

### 10. Role Flags over Single Role Column

**Decision:** User roles are stored as boolean flags in `profiles`, not as a single enum/text column.

```sql
is_customer BOOLEAN NOT NULL DEFAULT true
is_provider BOOLEAN NOT NULL DEFAULT false
is_admin    BOOLEAN NOT NULL DEFAULT false
```

This allows a single user to be both customer and provider.

**Do not:**
- Use `role TEXT CHECK IN ('customer', 'provider', 'admin')`
- Assume a provider cannot also be a customer

---

## Amendment Process

To change a frozen decision:

1. Raise it explicitly with the project owner
2. Document the reason in `docs/DECISION_LOG.md`
3. Update this file to reflect the new decision
4. Note which phase the change takes effect from

Never silently override a frozen decision in implementation.
