# Security / RLS / Auth / Webhook Task Template

> Use this template for any task touching: RLS policies, Supabase migrations, auth middleware, Stripe webhook security, or the field-tampering trigger.
>
> ⚠️ This is the highest-risk task category. A single wrong policy can expose all user data or break the payment flow.

---

## Step 0 — Required Reading (always first)

```
Read docs/PROJECT_MAP.md — subsystem B
Read docs/STABLE_MODULES.md — ALL sections
```

Do not proceed until both are read in full.

---

## Scope Declaration

State this before writing any code:

```
SUBSYSTEM: B — Security / Auth / RLS
TASK: [one sentence]
BLAST RADIUS: [what breaks if this goes wrong]
FILES IN SCOPE: [list only]
STABLE MODULES AFFECTED: [list — be specific]
ROLLBACK PLAN: [one sentence]
```

---

## Allowed Files (read + edit)

```
proxy.ts
lib/supabase/server.ts
lib/supabase/client.ts
supabase/migrations/*              ← read existing; create new only
```

---

## Forbidden Actions

```
NEVER modify an existing migration file.
NEVER run: supabase db reset
NEVER run: DROP TABLE, TRUNCATE, DELETE without WHERE
NEVER remove RLS from a table
NEVER disable a trigger without replacing it
NEVER weaken an auth check
NEVER commit .env files
NEVER expose service_role key in client-side code
```

---

## Migration Rules

Every database/security change must:

1. **Create a new `.sql` file** in `supabase/migrations/` — never edit an existing one.
2. File naming: `YYYYMMDDNNNN_description.sql` (increment `NNNN` within the same day).
3. Begin the file with a comment block:
   ```sql
   -- Migration NNN: [title]
   -- Purpose: [one sentence]
   -- Blast radius: [what could break]
   -- Rollback: (see bottom of file)
   ```
4. End the file with a `rollback:` comment block containing exact reversal SQL.
5. All policy names must be quoted strings matching the exact existing policy name if replacing.
6. Use `DROP POLICY IF EXISTS` before `CREATE POLICY` when replacing a policy.
7. Use `CREATE OR REPLACE FUNCTION` when updating a trigger function.

---

## RLS Policy Checklist

Before creating or modifying any RLS policy, verify:

- [ ] Table has RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Policy names are unique and descriptive (format: `"table: role can action"`)
- [ ] USING clause filters correctly for SELECT/UPDATE/DELETE
- [ ] WITH CHECK clause is specified for INSERT/UPDATE
- [ ] service_role bypass is intentional and documented (it bypasses RLS automatically)
- [ ] No policy accidentally exposes rows from other users
- [ ] The trigger `prevent_booking_field_tampering` is consistent with the new policy

---

## Booking Status State Machine (must not be violated)

```
pending_payment → confirmed    (service_role / Stripe webhook ONLY)
confirmed       → completed    (service_role / provider / admin)
confirmed       → cancelled    (service_role / provider / customer / admin)
pending_payment → cancelled    (service_role / customer / admin)
```

Any migration touching booking status must preserve this state machine exactly.

---

## Required Review Checklist (before applying migration)

- [ ] Migration is a new file, not an edit to an existing file
- [ ] Purpose and blast radius are documented in the file header
- [ ] Rollback SQL is present at the bottom
- [ ] State machine is preserved
- [ ] No secrets in the migration file
- [ ] `npm run build` passes after change

---

## Required Output

```
## Security Task Complete

MIGRATION FILE: supabase/migrations/[filename]
POLICIES CHANGED:
- [policy name] — [old behavior] → [new behavior]

BLAST RADIUS ANALYSIS:
- [what could break if wrong]

STATE MACHINE PRESERVED: [Yes / No — explain]

ROLLBACK AVAILABLE: [Yes — see migration file bottom]

STABLE MODULES AFFECTED:
- [list from STABLE_MODULES.md / None]

BUILD STATUS:
- npm run lint: [✅ / ❌]
- npm run build: [✅ / ❌]
- supabase db push: [✅ applied / ⏭️ pending]

NEXT: [one sentence]
```
