# Home Services Marketplace — Project Constitution

> **The goal is first real bookings in Utrecht.**
> Every decision must serve that goal. If it doesn't, don't build it yet.

---

## AI Context Rule

This file defines **project philosophy and non-changing business constraints** only.

For implementation workflows, subsystem file maps, stable module invariants, and task templates:

- Read `docs/PROJECT_MAP.md` — subsystem file map and module status
- Read `docs/AI_WORKFLOW.md` — task scoping, forbidden actions, output format
- Read `docs/STABLE_MODULES.md` — what must never change accidentally
- Use `prompts/*` templates — one template per task category

Do not treat this file as the full implementation guide. Do not scan the full repo without first reading `docs/PROJECT_MAP.md`.

---

## What This Project Is

A Dutch-first home services marketplace starting with premium mobile massage/wellness in Utrecht. The architecture is intentionally generic so future categories can be added — but the MVP exposes only massage.

## What This Project Is NOT (MVP Phase)

- Not a native mobile app
- Not a national or multi-city marketplace
- Not a multi-category platform
- Not an AI dispatch or recommendation system
- Not enterprise SaaS
- Not a microservice architecture

---

## Tech Stack

| Layer      | Technology                  |
|------------|-----------------------------|
| Framework  | Next.js 14+ App Router      |
| Language   | TypeScript (strict)         |
| Styling    | Tailwind CSS + shadcn/ui    |
| Database   | Supabase (PostgreSQL + RLS) |
| Auth       | Supabase Auth               |
| Payments   | Stripe                      |
| Maps       | Google Maps Places API      |
| i18n       | next-intl                   |
| Deployment | Vercel                      |

---

## Naming Rules (Critical)

Backend database and API code must use **generic marketplace naming**:

| Use This            | Never Use This          |
|---------------------|-------------------------|
| `providers`         | `massage_therapists`    |
| `customers`         | `clients`               |
| `services`          | `massage_services`      |
| `service_categories`| `massage_types`         |
| `provider_services` | `therapist_offerings`   |
| `bookings`          | `massage_bookings`      |
| `payments`          | —                       |
| `reviews`           | —                       |

Frontend UI copy may say "massage" for the MVP. The schema must not.

---

## MVP Constraints

- **City:** Utrecht, Netherlands only
- **Category:** Premium mobile massage / wellness only
- **Language:** Dutch first, English second (next-intl from day one)
- **Platform:** Website / PWA only
- **Validation target:** Real bookings, real providers, real Stripe payments

See `.claude/rules/mvp_scope.md` for the full allowed/forbidden feature list.

---

## Development Process

Before any code change: state objective, files in scope, what will NOT be built, acceptance criteria, and risk check.
After any code change: summarize what changed, how to test, what remains, and confirm no MVP scope drift.

Full workflow rules and task templates: `docs/AI_WORKFLOW.md` and `prompts/*`.

---

## Architecture Constraints

- App Router only — never Pages Router patterns
- All user-facing strings via `next-intl` — no hardcoded Dutch or English in JSX
- Database access only through Supabase client — never raw SQL strings in components
- All i18n keys in `messages/nl.json` (primary) and `messages/en.json`

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

---

## Business Guardrail

> **Ship real bookings in Utrecht first. Everything else is distraction.**

When in doubt: would this help a Utrecht customer book a massage today? If no, defer it.
