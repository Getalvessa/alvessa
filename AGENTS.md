<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Governance

## Agent Roles

### Codex — Read-Only Auditor
Codex is a **read-only reviewer**. It does not modify the repository under any circumstances.

**Permitted roles:**
- Security auditor
- Architecture reviewer
- Stripe / Supabase risk reviewer
- SEO and performance reviewer
- Code quality and correctness reviewer

### Claude — Sole Implementation Agent
Claude is the **only agent permitted to modify repository code**.

All file edits, new files, migrations, and configuration changes are Claude's exclusive responsibility. Claude follows the workflow defined in `CLAUDE.md` and `.claude/rules/`.

---

## Codex Forbidden Actions

Codex must never:

- Modify any file
- Edit code
- Create patches or diffs
- Apply fixes
- Run destructive or write commands
- Change database migrations
- Change environment variables
- Auto-refactor

Violation of these boundaries is a critical error. Codex must stop and flag the issue instead of acting.

---

## Workflow

```
Claude implements → Codex reviews → Claude fixes → Codex re-reviews
```

No other order is valid. Codex never skips directly to fixing.

---

## Codex Review Output Format

Every issue must follow this structure exactly:

```
ISSUE:                        [Short title]
WHY IT MATTERS:               [One sentence on the risk or impact]
RISK LEVEL:                   [CRITICAL | HIGH | MEDIUM | LOW]
AFFECTED FILES:               [Exact file paths]
RECOMMENDED FIX FOR CLAUDE:   [Concrete, actionable instruction]
```

Do not output vague suggestions. Every entry must be actionable by Claude.

---

## Project Tech Stack

| Layer      | Technology               |
|------------|--------------------------|
| Framework  | Next.js 14+ App Router   |
| Styling    | Tailwind CSS + shadcn/ui |
| Database   | Supabase (PostgreSQL)    |
| Auth       | Supabase Auth            |
| Payments   | Stripe                   |
| Maps       | Google Maps Places API   |
| Deployment | Vercel                   |
| Language   | TypeScript (strict)      |
| i18n       | next-intl                |

---

## Security Rules

Non-negotiable. Codex must flag any violation immediately as CRITICAL.

1. **No secrets in code.** API keys, tokens, and credentials belong only in `.env.local` or Vercel environment variables — never in source files.
2. **RLS must never be bypassed.** Every Supabase table accessed by end users must have Row Level Security enabled and enforced.
3. **Auth must never be weakened.** No authentication check may be removed, skipped, or bypassed without explicit project owner approval.
4. **Stripe stays in test mode** until the project owner explicitly approves live mode in writing.
5. **Internal routes must be protected.** Admin and provider routes must be enforced at the middleware level — never rely on UI-only guards.

---

## Context Loading Protocol

### Before ANY task — mandatory load sequence

```
Step 1: docs/PROJECT_MAP.md          (always, ~140 lines)
Step 2: docs/SCHEMA_SNAPSHOT.md      (only if task touches database/types/schema)
Step 3: docs/STABLE_MODULES.md       (only if task touches booking/payment/RLS/auth/webhook)
Step 4: ONE template from prompts/   (the single template matching this task type)
        → see docs/FEATURE_OWNERSHIP.md to identify which template
        → if no template matches: proceed without one
```

**NEVER load** all `prompts/*` templates at session start.
**NEVER load** templates for subsystems not involved in the current task.

### Schema understanding rule

```
Migration history is NOT the schema source of truth for reading.
docs/SCHEMA_SNAPSHOT.md IS the schema source of truth.

NEVER read supabase/migrations/ to understand current table structure.
READ docs/SCHEMA_SNAPSHOT.md instead.

ALLOWED to read migration files only when:
  - Writing a new migration (verify no conflicts with adjacent migration)
  - Auditing a specific named trigger/policy
  - Task is explicitly "review migration N"
  Max: 2 migration files per task.
```

### TASK_GATE — mandatory before any tool call

Output the TASK_GATE block (defined in `docs/TASK_GATE.md`) before the first tool call of any task.
If DECOMPOSITION is required: list sub-tasks and wait for user selection before starting.

### Context limits

See `docs/CONTEXT_BUDGET.md` for per-task file and line budgets.
Checkpoints: warn at 500 lines, hard stop at 1200 lines.
Terminal output: summarize; never dump full psql/docker/build output.

### Cross-subsystem tasks

If a task touches files from 2+ of: `supabase/migrations/`, `app/`, `messages/`, `lib/types/`:
→ STOP. See `docs/FEATURE_OWNERSHIP.md` for decomposition protocol.
→ Output decomposed task list. Wait for user to select which task to start.

### Scope expansion

If during a task a fix requires a file outside ALLOWED FILES:
1. Stop at that point.
2. Report what was found and why expansion would be needed.
3. Wait for explicit user instruction before touching the out-of-scope file.

Full rules: `docs/AI_WORKFLOW.md` · `docs/TASK_GATE.md` · `docs/CONTEXT_BUDGET.md` · `docs/FEATURE_OWNERSHIP.md`
