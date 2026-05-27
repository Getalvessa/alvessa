# Provider Dashboard Task Template

> Use this template for any task touching: provider dashboard pages, availability schedule, services configuration, profile editing, or earnings view.

---

## Step 0 — Required Reading

```
Read docs/PROJECT_MAP.md — subsystem D
```

No other docs required unless the task explicitly involves database changes (then also read subsystem B and STABLE_MODULES.md).

---

## Scope Declaration

```
SUBSYSTEM: D — Provider Dashboard
TASK: [one sentence]
FILES IN SCOPE: [list only]
DB CHANGE REQUIRED: [Yes → stop, use security_task.md / No]
```

---

## Allowed Files (read + edit)

```
app/[locale]/dashboard/layout.tsx
app/[locale]/dashboard/page.tsx
app/[locale]/dashboard/boekingen/page.tsx
app/[locale]/dashboard/beschikbaarheid/page.tsx
app/[locale]/dashboard/beschikbaarheid/availability-form.tsx
app/[locale]/dashboard/diensten/page.tsx
app/[locale]/dashboard/diensten/services-form.tsx
app/[locale]/dashboard/dienstvorm/page.tsx
app/[locale]/dashboard/dienstvorm/service-mode-form.tsx
app/[locale]/dashboard/profiel/page.tsx
app/[locale]/dashboard/profiel/profile-form.tsx
app/[locale]/dashboard/inkomsten/page.tsx
components/dashboard/sidebar.tsx
components/dashboard/stats-card.tsx
```

---

## Forbidden Files (do not read or touch)

```
app/[locale]/aanbod/[slug]/boeken/actions.ts    ← booking/payment — separate task
app/api/stripe/webhook/route.ts                 ← payment — separate task
app/api/availability/route.ts                   ← only if availability display bug
messages/nl.json / messages/en.json             ← copy task only
supabase/migrations/*                           ← security task only
proxy.ts                                        ← security task only
app/[locale]/admin/*                            ← admin task only
node_modules/
```

---

## Provider Dashboard Constraints

### Booking status transitions (provider-allowed only)
Providers may only update bookings that are already `confirmed`:
- `confirmed → completed` ✅
- `confirmed → cancelled` ✅
- `pending_payment → anything` ❌ (RLS blocks this)
- `anything → confirmed` ❌ (RLS + trigger both block this)

If the task involves status update UI, ensure the UI only offers `completed` and `cancelled` as options, and only for `confirmed` bookings.

### No direct Supabase writes from client components
All mutations must go through Server Actions or API routes — never direct Supabase client writes from browser components.

### Dashboard is provider-only
Routes under `/dashboard/*` are protected by middleware (`proxy.ts`). The pages may assume the user is an authenticated provider. Do not add additional auth checks that duplicate middleware logic.

### Availability schedules
- `day_of_week`: 0 = Sunday … 6 = Saturday (matches PostgreSQL `EXTRACT(DOW)`)
- Times are stored as Amsterdam local time (`HH:MM:SS`)
- `TZ_OFFSET_H = 2` (CEST, UTC+2) — winter CET (UTC+1) is a Phase 8 task

---

## Required Output

```
## Provider Dashboard Task Complete

FILES CHANGED:
- [path] — [what changed and why]

BOOKING STATUS TRANSITIONS SAFE: [Yes / N/A]
CLIENT-SIDE MUTATIONS INTRODUCED: [None / list — must use Server Actions]
DB SCHEMA CHANGED: [No — if Yes, stop and use security_task.md]

BUILD STATUS:
- npm run lint: [✅ / ❌]
- npm run build: [✅ / ❌]

NEXT: [one sentence]
```
