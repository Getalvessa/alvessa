# Context Budget — Alvessa Marketplace

> Hard constraints. Not guidelines. Violations must be flagged and stopped.

---

## Per-Task Read Budgets

| Task Type       | Max Files Read | Max Lines Read | Max Terminal Lines | Template Required         |
|-----------------|---------------|----------------|--------------------|---------------------------|
| copy / i18n     | 2             | 80             | 0                  | prompts/copy/copy_task.md |
| admin UI only   | 4             | 250            | 30                 | none (subsystem E)        |
| migration only  | 2 + SNAPSHOT  | 200            | 30                 | prompts/security/security_task.md |
| security / RLS  | 3 + SNAPSHOT  | 300            | 50                 | prompts/security/security_task.md |
| deployment      | 2             | 100            | 50                 | prompts/deployment/deployment_task.md |
| audit / review  | 4             | 300            | 0                  | prompts/audit/audit_task.md |
| cross-subsystem | FORBIDDEN     | —              | —                  | STOP — decompose first    |

`+ SNAPSHOT` means `docs/SCHEMA_SNAPSHOT.md` counts as one of the allowed files.

---

## Token Checkpoint Rule

After every file read, count running lines total:

```
< 300 lines  → proceed normally
  300 lines  → restate scope, confirm still on track
  500 lines  → pause: "Checkpoint — N lines read. Still within scope? Confirm."
  800 lines  → WARN: "Budget warning. Reading more requires explicit user approval."
 1200 lines  → HARD STOP. Report findings so far. Do not read further without explicit instruction.
```

Checkpoints are non-negotiable. Do not skip them to "finish quickly".

---

## Terminal Output Rule

Long terminal output is the second largest source of context waste after migration reads.

```
psql / docker exec output   → extract 3–5 key findings; discard the rest
npm run build               → last 10 lines only (unless error: include error block)
npm run lint                → summary line only ("0 errors, 1 warning")
supabase migration list     → count + first/last migration name only
git status / diff           → file names + line count only
git push output             → hash + branch only
```

**Rule:** If a bash output is > 20 lines, summarize it before reporting to context.
Do NOT dump full docker/psql/build output into your response.

---

## File Pre-Loading Rule

At the start of any task, load only:

```
ALWAYS:  docs/PROJECT_MAP.md
IF DB task:   docs/SCHEMA_SNAPSHOT.md
IF touches stable module:  docs/STABLE_MODULES.md
THEN:    the ONE relevant template from prompts/ (see FEATURE_OWNERSHIP.md)
```

**NEVER load** templates that are not relevant to the declared task.
**NEVER load** all prompts/* files at session start.

---

## Migration Read Rule

```
NEVER read migration files to understand current schema.
Use docs/SCHEMA_SNAPSHOT.md instead.

ALLOWED to read migration files only when:
  - Writing a new migration (need to verify no conflicts)
  - Auditing a specific trigger/policy by name
  - The task is explicitly "review migration X"

Max: 2 migration files per task. If you need more: stop, ask.
```

---

## Cross-Subsystem Budget

Tasks touching 2+ subsystems have no valid budget — they must be decomposed.

```
If task requires reading files from 2+ of:
  supabase/migrations/  (subsystem B)
  app/[locale]/admin/   (subsystem E)
  messages/             (subsystem C)
  app/[locale]/dashboard/ (subsystem D)

→ STOP. See docs/FEATURE_OWNERSHIP.md for decomposition.
```
