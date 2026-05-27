# Feature Ownership Map — Alvessa Marketplace

> Before starting any task, look up the feature here.
> This tells you: which subsystem owns it, which template to use, and whether to decompose.

---

## Lookup Table

| Feature / Keyword                          | Subsystem(s) | Template                        | Single Task? |
|--------------------------------------------|-------------|----------------------------------|--------------|
| Copy / i18n / legal text                   | C           | copy_task.md                     | ✅ Yes        |
| FAQ / privacy / terms page text            | C           | copy_task.md                     | ✅ Yes        |
| Provider profile (bio, slug, city, mode)   | D           | provider_task.md                 | ✅ Yes        |
| Provider availability schedule             | D           | provider_task.md                 | ✅ Yes        |
| Provider services config                   | D           | provider_task.md                 | ✅ Yes        |
| Provider earnings view                     | D           | provider_task.md                 | ✅ Yes        |
| Admin view: bookings list                  | E           | (admin task, no template)        | ✅ Yes        |
| Admin view: user management                | E           | (admin task, no template)        | ✅ Yes        |
| Booking flow (4-step UI)                   | A           | booking_task.md                  | ✅ Yes (HIGH RISK) |
| Payment / Stripe checkout                  | A           | booking_task.md                  | ✅ Yes (HIGH RISK) |
| Stripe webhook                             | A           | booking_task.md                  | ✅ Yes (HIGH RISK) |
| Availability API (slot calculation)        | A           | booking_task.md                  | ✅ Yes        |
| RLS policy change (any table)              | B           | security_task.md                 | ✅ Yes        |
| New migration (schema change)              | B           | security_task.md                 | ✅ Yes        |
| Trigger change (any table)                 | B           | security_task.md                 | ✅ Yes        |
| Middleware / auth guard                    | B           | security_task.md                 | ✅ Yes        |
| Supabase helper functions                  | B           | security_task.md                 | ✅ Yes        |
| Env vars / Vercel config / deployment      | —           | deployment_task.md               | ✅ Yes        |
| SEO landing pages (copy only)              | F+C         | copy_task.md                     | ✅ Yes        |
| SEO landing pages (layout/components)      | F           | (public page task)               | ✅ Yes        |
| **Provider trust / status / referral**     | **B + E**   | **DECOMPOSE (see below)**        | ❌ No         |
| **New schema field + admin UI**            | **B + E**   | **DECOMPOSE (see below)**        | ❌ No         |
| **New schema field + i18n keys**           | **B + C**   | **DECOMPOSE (see below)**        | ❌ No         |
| **New feature: schema + UI + i18n**        | **B+E+C**   | **DECOMPOSE (see below)**        | ❌ No         |
| **New service category (schema + copy)**   | **B + C**   | **DECOMPOSE (see below)**        | ❌ No         |
| **lib/types/database.ts update**           | **B**       | **Always with migration, never standalone** | ❌ No |

---

## Decomposition Protocol

When a feature spans multiple subsystems, split into sequential tasks:

### Template: Schema + Admin UI + i18n

```
Task 1 [subsystem B — security_task.md]
  Scope: migration only
  Files: new migration file, docs/SCHEMA_SNAPSHOT.md (update after)
  NOT: no app/ files, no messages/ files
  Output: migration file + SCHEMA_SNAPSHOT update

Task 2 [subsystem E — admin task]
  Scope: admin UI only — READ SCHEMA_SNAPSHOT, not migrations
  Files: app/[locale]/admin/[feature]/ only
  NOT: no new migrations, no messages/ files
  Output: updated admin UI components + actions

Task 3 [subsystem C — copy_task.md]
  Scope: i18n keys only
  Files: messages/nl.json, messages/en.json
  NOT: no .ts/.tsx logic files, no migrations
  Output: diff of changed keys only
```

**Rule: Never combine Task 1 + Task 2 + Task 3 in one session.**
Each task should fit within its budget (see CONTEXT_BUDGET.md).

---

## Real Examples

### Example A: Provider trust network (what was done wrong)

❌ **What happened:**
One session: schema + trigger + admin card UI + i18n → ctx 69%

✅ **Correct decomposition:**
```
Task 1: migration 016 (providers trust fields) + migration 017 (bookings reassignment)
        + extend prevent_provider_integrity_fields trigger
        + update lib/types/database.ts
        + update docs/SCHEMA_SNAPSHOT.md
        Files read: SCHEMA_SNAPSHOT + migration 008 (trigger only) = ~400 lines

Task 2: Admin provider card UI
        Files read: SCHEMA_SNAPSHOT + 3 admin files = ~350 lines

Task 3: i18n keys for admin trust UI
        Files read: messages/nl.json (target section) + messages/en.json = ~80 lines

Total: 3 sessions × ~350 lines avg = ~1050 lines vs. 1644+ lines in one session
```

### Example B: New service category

❌ Wrong: "Add a Deep Sleep massage category with copy and schema"
✅ Correct:
```
Task 1: Migration (service_categories INSERT) — security_task.md
Task 2: Copy keys (nl.json + en.json) — copy_task.md
```

---

## One Feature Task ≠ One Implementation Session

"Feature complete" means all tasks are done, not that one task covered everything.
It is correct and expected to say: "Task 1 done. Task 2 is the UI. Task 3 is the copy."
