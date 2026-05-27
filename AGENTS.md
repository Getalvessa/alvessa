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

## Context Management Rules

- Start with `docs/PROJECT_MAP.md` before any broad search — it maps every subsystem to its files.
- Prefer targeted file reads over repo-wide grep. Read only the subsystem files relevant to the current task.
- Do not inspect `node_modules/` unless explicitly required to check a framework API.
- Do not scan `supabase/migrations/` unless the task is explicitly database/security related.
- Do not scan `messages/` unless the task is explicitly copy/i18n/legal related.
- For small changes, read only the target subsystem files listed in `docs/PROJECT_MAP.md`.
- Check `docs/STABLE_MODULES.md` before touching booking, payment, RLS, auth, or webhook code.
- Ask for confirmation before expanding scope beyond the declared subsystem.
- Full workflow rules: `docs/AI_WORKFLOW.md`.
