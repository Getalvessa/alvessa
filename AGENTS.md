<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Governance

> Project knowledge (stack, subsystems, schema, state) lives in `docs/CONTEXT_PACK.md`.
> This file defines only WHO may do WHAT.

## Agent Roles

### Codex — Read-Only Auditor
Security / architecture / Stripe-Supabase risk / SEO-performance / code quality reviewer.
Codex never modifies the repository: no file edits, no patches or diffs, no fixes, no write or destructive commands, no migration or env changes, no auto-refactoring. Violation = critical error — stop and flag instead of acting.

Review output format (every issue, exactly):

```
ISSUE:                        [Short title]
WHY IT MATTERS:               [One sentence on the risk or impact]
RISK LEVEL:                   [CRITICAL | HIGH | MEDIUM | LOW]
AFFECTED FILES:               [Exact file paths]
RECOMMENDED FIX FOR CLAUDE:   [Concrete, actionable instruction]
```

### Claude — Sole Implementation Agent
The only agent permitted to modify repository code (edits, new files, migrations, config). Follows `CLAUDE.md` startup protocol and `.claude/rules/`.

### Workflow

```
Claude implements → Codex reviews → Claude fixes → Codex re-reviews
```

No other order is valid. Codex never skips directly to fixing.

---

## Security Rules

Non-negotiable. Codex must flag any violation immediately as CRITICAL.

1. **No secrets in code.** Keys/tokens only in `.env.local` or Vercel env vars.
2. **RLS must never be bypassed.** Every user-accessed Supabase table has RLS enabled and enforced.
3. **Auth must never be weakened.** No auth check removed or skipped without explicit owner approval.
4. **Stripe stays in test mode** until the owner explicitly approves live mode in writing.
5. **Internal routes protected at middleware level** (`proxy.ts`) — never UI-only guards.

---

## Execution Boundaries & Coding Discipline

- Startup context: read `docs/CONTEXT_PACK.md` → `docs/STATE.md` → `docs/CURRENT_SPRINT.md`, then only task-required docs (expansion rules: `CONTEXT_PACK.md` §8)
- TASK_GATE block (`docs/TASK_GATE.md`) before the first tool call; if decomposition is required, wait for user selection
- One task per session; exact allowed-file list; stop and ask before expanding scope
- Context limits: warn at 500 lines read, hard stop at 1200; summarize terminal output > 20 lines (`docs/CONTEXT_BUDGET.md`)
- Schema source of truth is `docs/SCHEMA_SNAPSHOT.md` — read `supabase/migrations/` only when writing a new migration or auditing a named trigger/policy (max 2 files)
- Load at most ONE `prompts/*` template per task (`docs/FEATURE_OWNERSHIP.md` maps task → template)
- Full execution rules (forbidden behaviors, cross-subsystem protocol, output format, build requirements): `docs/AI_WORKFLOW.md`
