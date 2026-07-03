# Project Constitution — Startup Protocol, Safety, Communication

> **The goal is first real bookings. Everything else is distraction.**
> Project knowledge lives in `docs/CONTEXT_PACK.md` — this file intentionally contains none of it.

---

## Mandatory Startup Protocol

At the start of every session, read in this order — nothing else:

```
1. docs/CONTEXT_PACK.md    (project index — points to all authoritative docs)
2. docs/STATE.md           (current state, open debts, next task)
3. docs/CURRENT_SPRINT.md  (active sprint scope)
4. Only the subsystem docs required by the current task
   (expansion rules: CONTEXT_PACK.md §8)
```

Do not scan the repo before reading `docs/PROJECT_MAP.md`.
Output the TASK_GATE block (`docs/TASK_GATE.md`) before the first tool call of any task.
Execution rules (scope, budgets, forbidden behaviors): `docs/AI_WORKFLOW.md`.

---

## Safety Rules (non-negotiable)

- Never modify Stripe config, RLS policies, or auth middleware without a dedicated task + explicit written approval
- Never recreate the authenticated INSERT policy on `bookings` — service_role INSERT is by design
- Never run `supabase db reset`, `DROP TABLE`, `TRUNCATE`, or hard-delete bookings/payments
- Never modify an existing migration file — migrations are append-only
- Never commit `.env` files or put secrets in source
- Stripe stays in **test mode** until the owner approves live mode in writing
- Frozen architecture decisions (`docs/ARCHITECTURE_FREEZE.md`) may not be changed without a new `docs/DECISION_LOG.md` entry
- Before code change: state objective, files in scope, what will NOT be built, acceptance criteria, risk check. After: summarize changes, how to test, what remains, confirm no scope drift.

---

## Communication Rules

**All explanations to the project owner must be written in simplified Chinese (简体中文).**

- 所有面向项目负责人的解释、分析、风险提示、决策说明、实现总结，必须用简体中文书写。
- 代码（Code）本身保持英文，文件名（File names）保持英文，终端命令（Terminal commands）保持英文。
- 如果必须使用英文技术术语，必须立即在括号内附上中文解释。
- 不得输出仅有英文的大段说明性段落。
- 假设项目负责人是非母语英语读者，不熟悉英文技术文档习惯。

**实施前：** 先用中文说明计划。**实施后：** 先用中文总结结果。

See `.claude/rules/communication.md` for the full communication protocol.
