# AI Execution Rules — Alvessa Marketplace

> Prevents context explosion, scope creep, and accidental mutations to security-critical modules.

---

## Core Rules

1. **One window = one task.** Start one task, finish it, stop.
2. **Use exact allowed file list.** The task prompt specifies ALLOWED FILES. Read and write only those files.
3. **Need another file? Stop and ask.** Do not expand scope silently.
4. **Never continue into follow-up work.** After completing the task, report done and stop.
5. **Do not add dependencies, migrations, env vars, or docs** unless explicitly listed in ALLOWED FILES.
6. **ctx 30%:** Wrap up current step, output progress, ask what's next.
7. **ctx 40%:** Hard stop. Output handoff summary only. Do not start new work.

---

## TASK_GATE

Output this block **before the first tool call** of any task. No exceptions.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK SCOPE:       [one sentence — what changes, nothing else]
READ LIMIT:       [N files, M lines — from docs/CONTEXT_BUDGET.md]
ALLOWED FILES:    [exact file list from PROJECT_MAP.md subsystem]
FORBIDDEN FILES:  [dirs/subsystems explicitly out of scope]
EXPECTED MODULE:  [A / B / C / D / E / F / docs-only]
CONTEXT BUDGET:   [e.g. "300 lines read, 30 lines terminal"]
STOP CONDITION:   [what triggers a pause or decomposition]
DECOMPOSITION:    [required / not required]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Full field definitions and worked examples: `docs/TASK_GATE.md`.
If DECOMPOSITION = required: list sub-tasks, wait for user selection — do not start Task 1 unilaterally.

---

## Context Budget

Per-task file and line budgets: `docs/CONTEXT_BUDGET.md`.

```
< 500 lines read → proceed normally
  500 lines      → pause: "Checkpoint — N lines read. Still within scope?"
  800 lines      → WARN: reading more requires explicit user approval
 1200 lines      → HARD STOP — report findings, do not read further
```

Terminal output > 20 lines must be summarized; never dump full build/psql/docker output.

---

## Security / Payment / RLS Tasks

These require a **separate, dedicated task + explicit user confirmation** before starting:
- Any change to `supabase/migrations/`
- Any change to `app/api/stripe/webhook/route.ts` or Stripe config
- Any change to RLS policies or auth middleware (`proxy.ts`)
- Any new environment variable

Never combine security/payment tasks with UI or i18n work in the same session.

---

## Forbidden Behaviors (Always)

- Never scan `node_modules/` unless explicitly required
- Never read `supabase/migrations/` to understand current schema — use `docs/SCHEMA_SNAPSHOT.md` instead (allowed only when writing a new migration or auditing a specific trigger/policy by name; max 2 files per task)
- Never scan `supabase/migrations/` for general orientation unless task is explicitly database/security
- Never scan `messages/` unless task is explicitly copy/i18n
- Never combine two independent issues in one task — flag and stop
- Never refactor code unrelated to the task
- Never modify Stripe config without explicit written approval
- Never modify RLS policies without explicit written approval
- Never add npm dependencies without explicit written approval
- Never run `supabase db reset` — this destroys production data
- Never commit `.env` files
- Never modify an existing migration file; migrations are append-only
- Never run DROP TABLE, TRUNCATE, or hard-delete bookings/payments records

---

## Scope Expansion

If fix requires a file outside ALLOWED FILES:
1. Stop immediately.
2. Report what was found and why expansion is needed.
3. Wait for explicit user instruction before touching the out-of-scope file.

---

## Cross-Subsystem Protocol

A task touching files from 2+ of these directories has no valid budget and must be decomposed:

```
supabase/migrations/      (B — Security/Schema)
app/[locale]/admin/       (E — Admin)
app/[locale]/dashboard/   (D — Provider Dashboard)
app/[locale]/*            (A/F — Booking/Public routes)
messages/                 (C — i18n)
lib/types/                (cross-cutting — types only)
```

`lib/types/database.ts` rule:
- Update ONLY as a child step of a Subsystem B (migration) task.
- Never update it standalone.
- Never update it inside a UI or i18n task.

When cross-subsystem detected — STOP before any read or write:
1. Output decomposed task list (scope + subsystem + budget for each)
2. Wait for user to select which task to start
3. Complete only that task, then ask what's next — never auto-continue to the next sub-task

Full protocol and detection triggers: `docs/FEATURE_OWNERSHIP.md`.

---

## Task Templates

`prompts/` contains per-category templates. Load ONE matching template per task — after reading `docs/PROJECT_MAP.md`. Check `docs/FEATURE_OWNERSHIP.md` to identify which template applies.

| Task category | Template |
|---|---|
| Copy / i18n | `prompts/copy/copy_task.md` |
| Booking / payment | `prompts/booking/booking_task.md` |
| Security / RLS / migration | `prompts/security/security_task.md` |
| Provider dashboard | `prompts/provider/provider_task.md` |
| Audit / review | `prompts/audit/audit_task.md` |
| Deployment | `prompts/deployment/deployment_task.md` |

NEVER load all templates at session start. NEVER load a template for a subsystem not in scope.

---

## Required Output Format

After every task:

```
## Task Complete

FILES CHANGED:
- path/to/file — [what changed and why]

TOUCHES RLS / PAYMENT / AUTH: [Yes — explain / No]

BUILD STATUS:
- npm run lint:  [✅ 0 errors / ❌ see below / ⏭️ not required]
- npm run build: [✅ success  / ❌ see below / ⏭️ not required]

Required for:
  - Subsystem A (booking/payment) tasks — always
  - Subsystem B (RLS/migration) tasks — always
  - Any task where TOUCHES RLS / PAYMENT / AUTH = Yes

Not required (mark ⏭️):
  - Subsystem C (copy/i18n) tasks
  - docs-only changes

NEXT SUGGESTED STEP: [one sentence]
```

---

## Subsystem Risk Levels

| Subsystem | Risk | Key constraint |
|-----------|------|----------------|
| A — Booking / Payment | 🔴 HIGH | Read STABLE_MODULES.md before touching |
| B — Security / RLS | 🔴 HIGH | Dedicated task + review required |
| C — i18n / Copy | 🟡 MEDIUM | Touch only messages/* and relevant page |
| D — Provider Dashboard | 🟢 LOW | Self-contained, provider-only routes |
| E — Admin | 🟡 MEDIUM | Never weaken auth guards |
| F — Public Pages | 🟢 LOW | No mutations, lowest risk |
