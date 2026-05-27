# Prompt Guide — How to Use Task Templates

> This guide explains when to use each template, how to minimize context consumption, and how to protect stable modules from accidental changes.

---

## Which Template to Use

| Task involves… | Use template |
|----------------|-------------|
| Booking flow, availability, Stripe checkout, webhook | `prompts/booking/booking_task.md` |
| RLS policies, migrations, auth middleware, trigger | `prompts/security/security_task.md` |
| Customer-facing text, message keys, legal pages, SEO copy | `prompts/copy/copy_task.md` |
| Provider dashboard, availability schedule, services, earnings | `prompts/provider/provider_task.md` |
| Vercel config, env vars, build, migration deploy | `prompts/deployment/deployment_task.md` |
| Any read-only review, audit, or risk assessment | `prompts/audit/audit_task.md` |

---

## How to Start a Task (Recommended Prompt Format)

```
Read docs/PROJECT_MAP.md first.
Read prompts/[category]/[template].md.

TASK: [one sentence description]
SCOPE: [subsystem name from PROJECT_MAP.md]
FILES: [list specific files if known]

[Task details]
```

### Example — fixing a booking bug

✅ Correct:
```
Read docs/PROJECT_MAP.md first.
Read prompts/booking/booking_task.md.

TASK: Fix the availability API returning slots that overlap with existing bookings.
SCOPE: Subsystem A — Booking / Payment
FILES: app/api/availability/route.ts
```

❌ Wrong:
```
Something is broken with bookings. Please inspect the whole project and find the issue.
```

The wrong version causes the AI to scan all subsystems, read migrations, read dashboard code, read message files — none of which are relevant. It wastes context and risks accidental changes.

---

### Example — fixing copy wording

✅ Correct:
```
Read docs/PROJECT_MAP.md first.
Read prompts/copy/copy_task.md.

TASK: The FAQ cancellation answer (faq.a2) implies self-service cancel. Fix it to direct to the contact email.
SCOPE: Subsystem C — i18n / Copy / Legal
FILES: messages/nl.json, messages/en.json (key: faq.a2 only)
```

❌ Wrong:
```
Review all the copy on the website and fix any issues you find.
```

The wrong version causes the AI to read booking files, admin code, migrations, and component code — all irrelevant.

---

### Example — adding a new RLS policy

✅ Correct:
```
Read docs/PROJECT_MAP.md first.
Read prompts/security/security_task.md.
Read docs/STABLE_MODULES.md.

TASK: Add a policy allowing customers to read their own bookings.
SCOPE: Subsystem B — Security / RLS
This is a new migration only. Do not touch any other files.
```

❌ Wrong:
```
Can you add some security to the bookings table?
```

The wrong version gives no scope boundary and may cause unintended changes to existing policies.

---

## How to Reduce Context Consumption

### Rule 1: Name the files
Always tell the AI which files are in scope. "Fix the booking bug" causes a full-repo search. "Fix `app/api/availability/route.ts` line 81" reads one file.

### Rule 2: Use subsystem names from PROJECT_MAP.md
Subsystem names (A, B, C, D, E, F) are short and unambiguous. Use them.

### Rule 3: Name the message keys, not just the feature
Instead of "fix the cancellation copy", say "fix `faq.a2` in `messages/nl.json`".

### Rule 4: One task = one subsystem
Never combine a copy fix with a booking fix in the same task. Context compounds.

### Rule 5: Tell the AI what NOT to read
Explicitly saying "do not read migrations" or "do not read messages/" prevents the AI from following curiosity threads.

---

## How to Protect Stable Modules

The 9 stable modules in `docs/STABLE_MODULES.md` must not be changed as a side effect of unrelated tasks.

**To protect them:**
1. When starting any task, check if it could touch a stable module.
2. If yes: explicitly state which invariants must remain intact (the template does this automatically).
3. If the AI finds it needs to change a stable module for an unrelated reason: stop, flag it, create a separate task.

**Stable modules by subsystem:**

| Subsystem | Stable modules |
|-----------|----------------|
| A (Booking) | Modules 1, 2, 5, 6, 7, 8, 9 |
| B (Security) | Modules 2, 3, 4, 5 |
| Both | Module 7 (open redirect), Module 8 (availability RLS) |

---

## Quick Reference

```
docs/PROJECT_MAP.md      → what files exist and where
docs/STABLE_MODULES.md   → what must never change accidentally
docs/AI_WORKFLOW.md      → rules for every task type
docs/PROMPT_GUIDE.md     → this file — how to use templates
prompts/booking/         → booking / payment / availability
prompts/security/        → RLS / auth / migrations
prompts/copy/            → text / i18n / legal
prompts/provider/        → dashboard / schedule / services
prompts/deployment/      → Vercel / env / production
prompts/audit/           → read-only review
```
