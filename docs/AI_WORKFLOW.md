# AI Workflow Rules — Alvessa Marketplace

> These rules exist to prevent context explosion, unintended scope creep, and accidental mutations to stable security-critical modules.

---

## Core Principle

**One task = one subsystem = one scope boundary.**

Never start a task without first reading `docs/PROJECT_MAP.md` to identify which subsystem is relevant, then reading only the files in that subsystem.

---

## Before Starting Any Task

1. Read `docs/PROJECT_MAP.md` — identify which subsystem(s) are in scope.
2. Read only the files listed for that subsystem.
3. Check `docs/STABLE_MODULES.md` — if the task touches a stable module, require explicit confirmation before proceeding.
4. State the scope boundary out loud: "This task touches subsystem X. I will NOT touch subsystem Y."

---

## Scope Rules by Task Type

### Copy / i18n / Legal task
- Read: `messages/nl.json`, `messages/en.json`, and the relevant page file only.
- Do NOT read: booking code, RLS migrations, dashboard code.
- Do NOT modify: any `.ts` or `.tsx` logic file.
- Output: diff of changed message keys only.

### Booking / Payment task
- Read: subsystem A files from PROJECT_MAP.md only.
- Do NOT read: dashboard, admin, marketing pages.
- If touching `actions.ts` or `webhook/route.ts`: treat as HIGH RISK — see STABLE_MODULES.md.
- Must run `npm run lint` and `npm run build` after any change.

### RLS / Database / Security task
- Read: subsystem B files + relevant migration files only.
- This is the highest-risk category. A single wrong policy can expose all user data.
- Requires dedicated single-purpose task — never combine with UI or copy work.
- Must create a new migration file — never modify existing migrations.
- Must include rollback SQL in the migration comment block.
- Must run `npm run build` after changes.

### Provider Dashboard task
- Read: subsystem D files only.
- These are provider-only routes protected by middleware. Low blast radius.
- Do NOT modify RLS policies or payment code.

### Admin task
- Read: subsystem E files only.
- Admin routes are protected at middleware level. Do not weaken auth guards.
- Admin may read all bookings but must not bypass payment state machine.

### Public page / SEO task
- Read: subsystem F files + relevant message keys only.
- These pages have no mutations — lowest risk category.
- Do NOT rewrite copy beyond what is explicitly requested.

---

## Forbidden Behaviors (Always)

- **Never scan `node_modules/`** unless explicitly required to check a framework API.
- **Never scan `supabase/migrations/`** unless the task is explicitly database/security related.
- **Never scan `messages/`** unless the task is explicitly copy/i18n/legal related.
- **Never perform large-scale grep across the entire repo** for a task that is clearly scoped to one subsystem.
- **Never combine two independent issues in one task.** If a second issue is discovered while working on another, flag it and stop — do not fix it inline.
- **Never refactor code that is not directly related to the task.** No opportunistic cleanup.
- **Never modify Stripe configuration** without explicit written approval.
- **Never modify RLS policies** without explicit written approval.
- **Never add npm dependencies** without explicit written approval.
- **Never add environment variables** without explicit written approval.
- **Never run `supabase db reset`** — this destroys production data.
- **Never commit `.env` files.**

---

## Required Output Format

After every task, output this checklist:

```
## Task Complete

FILES CHANGED:
- path/to/file.ts — [what changed and why]

AFFECTED SUBSYSTEM: [A / B / C / D / E / F from PROJECT_MAP.md]

TOUCHES RLS / PAYMENT / AUTH: [Yes — explain / No]

BUILD STATUS:
- npm run lint: [✅ 0 errors / ❌ see below]
- npm run build: [✅ success / ❌ see below / ⏭️ not required for this task type]

STABLE MODULES AFFECTED: [Yes — list which / No]

NEXT SUGGESTED STEP: [one sentence]
```

---

## Scope Expansion Rule

If during a task you discover that the fix requires touching a file outside the declared subsystem:

1. Stop.
2. Report what you found and why expansion is needed.
3. Wait for explicit confirmation before expanding scope.

Do NOT silently expand scope. Do NOT assume "it's just one more file."

---

## Task Size Guideline

| Change size | Example | Action |
|-------------|---------|--------|
| 1-3 message keys | Fix one copy issue | Proceed immediately |
| 1-2 component files | Fix a UI bug | Proceed immediately |
| New migration | Add/change RLS | Ask before writing |
| New API route | Add endpoint | Ask before writing |
| Cross-subsystem change | Touches A + B | Always ask first |
| New npm package | Any dependency | Always ask first |
