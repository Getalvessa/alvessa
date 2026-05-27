# TASK_GATE Protocol — Alvessa Marketplace

> Claude must output this block BEFORE any tool call in any task.
> No exceptions. No "it's obvious." No "I'll do it after."
> If any field cannot be filled: ask the user. Do not guess.

---

## Mandatory Declaration Block

Copy and fill this block at the start of every task:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK SCOPE:       [one sentence — what changes, nothing else]
READ LIMIT:       [N files, M lines — from CONTEXT_BUDGET.md]
ALLOWED FILES:    [exact file list — from PROJECT_MAP.md subsystem]
FORBIDDEN FILES:  [explicit list of subsystems/dirs NOT in scope]
EXPECTED MODULE:  [A / B / C / D / E / F / docs-only]
CONTEXT BUDGET:   [e.g. "300 lines read, 30 lines terminal"]
STOP CONDITION:   [what triggers a pause or decomposition]
DECOMPOSITION:    [required / not required — reason]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Field Definitions

**TASK SCOPE**
One sentence. Subject = what file(s) change. Predicate = what changes.
Bad:  "Implement the trust network feature"
Good: "Add status + trust_level columns to providers, extend integrity trigger"

**READ LIMIT**
Pull the number from CONTEXT_BUDGET.md for this task type.
If unsure of task type, default to the tightest applicable budget.

**ALLOWED FILES**
The specific files you will read AND edit. Not a subsystem — actual paths.
If you don't know yet: list PROJECT_MAP.md entries for the subsystem, then narrow.

**FORBIDDEN FILES**
List at minimum:
- Every subsystem NOT in scope (e.g. "app/*, messages/*, supabase/migrations/*")
- Any file the task might tempt you to "just quickly check"

**EXPECTED MODULE**
Single letter from PROJECT_MAP.md. If two letters appear: DECOMPOSITION = required.

**CONTEXT BUDGET**
Lines read + terminal lines. Hard numbers. If you exceed them: stop and warn.

**STOP CONDITION**
The specific event that makes you pause and ask the user.
Example: "If fix requires touching messages/ → stop, create separate Task 3"
Example: "If lib/types/database.ts update needed → stop, confirm with user"

**DECOMPOSITION**
Check FEATURE_OWNERSHIP.md.
- "not required" → proceed
- "required" → list sub-tasks, get user approval before starting Task 1

---

## Decomposition Required: What To Do

When DECOMPOSITION = required:

1. Output the sub-task list:
```
This task spans [N] subsystems and must be decomposed:
  Task 1: [scope] — [subsystem] — [budget]
  Task 2: [scope] — [subsystem] — [budget]
  Task 3: [scope] — [subsystem] — [budget]
Which task should I start with?
```

2. Wait for user selection.
3. Start ONLY that task. Output a new TASK_GATE for it.
4. Complete it fully (including lint/build if required).
5. Report Task N complete. Ask which task is next.

Do NOT start Task 2 automatically after Task 1 completes.

---

## Worked Examples

### Example 1: Simple migration

```
TASK SCOPE:       Add event_type column to bookings table (nullable TEXT)
READ LIMIT:       2 files, 150 lines
ALLOWED FILES:    docs/SCHEMA_SNAPSHOT.md
                  supabase/migrations/202605270005_booking_event_type.sql (to write)
FORBIDDEN FILES:  app/*, messages/*, lib/types/* (update types separately if needed)
EXPECTED MODULE:  B
CONTEXT BUDGET:   150 lines read, 20 lines terminal
STOP CONDITION:   If bookings trigger needs updating → stop, new task
DECOMPOSITION:    Not required (schema only)
```

### Example 2: Admin UI change

```
TASK SCOPE:       Add "trust level" display badge to admin providers table
READ LIMIT:       4 files, 250 lines
ALLOWED FILES:    docs/SCHEMA_SNAPSHOT.md (schema ref, not migration)
                  app/[locale]/admin/aanbieders/page.tsx
                  app/[locale]/admin/aanbieders/providers-table.tsx
                  app/[locale]/admin/aanbieders/actions.ts
FORBIDDEN FILES:  supabase/migrations/*, messages/*, lib/types/* (read-only ref OK)
EXPECTED MODULE:  E
CONTEXT BUDGET:   250 lines read, 30 lines terminal
STOP CONDITION:   If new i18n keys needed → complete UI first, then create Task 3 (i18n)
DECOMPOSITION:    Not required (UI only, trust fields already in schema)
```

### Example 3: Cross-subsystem (decompose required)

```
TASK SCOPE:       Add "provider badges" feature (new DB field + admin UI + copy)
READ LIMIT:       N/A — decomposition required first
ALLOWED FILES:    N/A
FORBIDDEN FILES:  N/A
EXPECTED MODULE:  B + E + C
CONTEXT BUDGET:   N/A
STOP CONDITION:   N/A
DECOMPOSITION:    REQUIRED

This task spans 3 subsystems and must be decomposed:
  Task 1: Migration (add badge field to providers) — Module B — budget: 200 lines
  Task 2: Admin UI (show/edit badge) — Module E — budget: 250 lines
  Task 3: i18n keys (badge labels) — Module C — budget: 80 lines
Which task should I start with?
```

---

## Anti-Patterns (Never Do These)

```
❌ "I'll just quickly check this migration file to confirm..."
   → If not in ALLOWED FILES: do not read it.

❌ "While I'm here, I'll also update the types file..."
   → If not in TASK SCOPE: do not touch it. Flag as separate task.

❌ "The user asked for the feature — I'll just do all three parts..."
   → If DECOMPOSITION = required: always decompose. Always.

❌ "I need to read a few migrations to understand the trigger..."
   → Use docs/SCHEMA_SNAPSHOT.md. Trigger details are documented there.

❌ Starting a task without outputting the TASK_GATE block first.
```
