# Audit / Review Task Template

> Use this template for any read-only review task: security audit, copy review, architecture review, launch readiness check, or risk assessment.
>
> **Default mode: read-only. No files are modified.**

---

## Step 0 — Required Reading

```
Read docs/PROJECT_MAP.md — full file
Read docs/STABLE_MODULES.md — full file
```

For security audits also read:
```
AGENTS.md
supabase/migrations/* (relevant files)
proxy.ts
lib/supabase/server.ts
```

---

## Scope Declaration

```
AUDIT TYPE: [security / copy / architecture / launch-readiness / performance]
SCOPE: [specific subsystem or "full project"]
OUTPUT REQUESTED: [blockers only / full report / specific concern]
READ-ONLY: Yes — no files will be modified
```

---

## Audit Behavior Rules

- **Default: read-only.** Do not modify any file without an explicit separate task.
- **Do not auto-refactor.** Finding a code smell is not permission to fix it.
- **Do not enterprise-overengineer.** Flag issues proportional to the MVP stage.
- **Flag, don't fix.** Every finding should produce a `RECOMMENDED FIX FOR CLAUDE` entry, not an inline edit.
- **Stop at scope boundary.** If you find an issue outside the declared scope, note it — do not follow the thread.

---

## Output Format

Every finding must use this structure:

```
ISSUE:                      [Short descriptive title]
WHY IT MATTERS:             [One sentence on the risk or impact]
RISK LEVEL:                 [CRITICAL | HIGH | MEDIUM | LOW]
AFFECTED FILES:             [Exact file paths]
RECOMMENDED FIX FOR CLAUDE: [Concrete, actionable instruction]
```

Do not output vague suggestions. Every entry must be actionable.

---

## Risk Level Definitions

| Level | Meaning |
|-------|---------|
| CRITICAL | Data exposure, auth bypass, payment fraud, or site-down risk |
| HIGH | Feature broken, security weakened, legal/GDPR violation risk |
| MEDIUM | User-facing bug, copy issue, performance problem |
| LOW | Code quality, minor UX, nice-to-have improvement |

---

## Summary Output Format

End every audit with:

```
## Audit Summary

STATUS: [✅ No blockers / ⚠️ Issues found / 🔴 Critical issues]

BLOCKERS (CRITICAL / HIGH):
- [list, or "None"]

RISKS (MEDIUM):
- [list, or "None"]

NOTES (LOW):
- [list, or "None"]

STABLE MODULES STATUS:
- [any stable module violations found, or "All intact"]

NEXT RECOMMENDED ACTION:
- [one sentence — what to address first]
```

---

## Scope Guide by Audit Type

### Security audit
Read: subsystem B files + relevant migrations + `proxy.ts`
Focus: RLS policies, auth bypasses, booking state machine, service_role usage, open redirects, secrets in code.

### Copy / legal audit
Read: `messages/nl.json`, `messages/en.json`, legal pages
Focus: medical claims, absolute claims, cancellation wording, GDPR accuracy, Dutch spelling.

### Architecture audit
Read: `docs/PROJECT_MAP.md`, `docs/STABLE_MODULES.md`, subsystem entry points
Focus: module boundaries, separation of concerns, missing error handling at system boundaries.

### Launch readiness audit
Read: `docs/PROJECT_MAP.md` (status table), `docs/STABLE_MODULES.md`, `prompts/deployment/deployment_task.md`
Focus: build status, migration state, env vars, Stripe mode, known open issues.

---

## Anti-Patterns to Flag

- `any` type in TypeScript (flag as MEDIUM unless in security path, then HIGH)
- Hardcoded strings in JSX that bypass i18n (flag as MEDIUM)
- `createClient()` used where `createServiceRoleClient()` is needed for availability/booking reads (flag as HIGH)
- `createServiceRoleClient()` used where `createClient()` should be used (flag as HIGH — over-privilege)
- Client-side direct Supabase writes bypassing Server Actions (flag as HIGH)
- Medical claims or absolute trust claims in copy (flag as HIGH — legal risk)
- Missing error handling at Supabase query boundary (flag as MEDIUM)
- `TZ_OFFSET_H = 2` hardcoded (known Phase 8 issue — flag as LOW, already documented)
