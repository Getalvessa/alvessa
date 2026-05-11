# Home Services Marketplace — Claude Project Instructions

> **The goal is first real bookings in Utrecht.**
> Every decision must serve that goal. If it doesn't, don't build it yet.

---

## What This Project Is

A Dutch-first home services marketplace platform starting with premium mobile massage/wellness in Utrecht, Netherlands. The architecture is intentionally generic so future categories (cleaning, tutoring, etc.) can be added — but the MVP exposes only massage.

## What This Project Is NOT (MVP Phase)

- Not a native mobile app
- Not a national or multi-city marketplace
- Not a multi-category platform
- Not an AI dispatch or recommendation system
- Not enterprise SaaS
- Not a microservice architecture

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe |
| Maps | Google Maps Places API |
| i18n | next-intl |
| Deployment | Vercel |

---

## Naming Rules (Critical)

Backend database and API code must use **generic marketplace naming**:

| Use This | Never Use This |
|---|---|
| `providers` | `massage_therapists` |
| `customers` | `clients` |
| `services` | `massage_services` |
| `service_categories` | `massage_types` |
| `provider_services` | `therapist_offerings` |
| `bookings` | `massage_bookings` |
| `payments` | — |
| `reviews` | — |

Frontend UI copy may say "massage" for the MVP. The schema must not.

---

## MVP Constraints

- **City:** Utrecht, Netherlands only
- **Category:** Premium mobile massage / wellness only
- **Language:** Dutch first, English second (next-intl from day one)
- **Platform:** Website / PWA only
- **Validation target:** Real bookings, real providers, real Stripe payments

See `.claude/rules/mvp_scope.md` for the full allowed/forbidden list.

---

## Development Process

Before changing any code, show:
1. **Objective** — what this change achieves
2. **Files to change** — explicit list
3. **What will NOT be built** — scope boundary
4. **Acceptance criteria** — how to know it's done
5. **Risk check** — any regressions or blockers

After changing code, show:
1. **What changed** — summary of edits
2. **How to test** — exact steps
3. **What remains** — next logical step
4. **MVP scope check** — confirm no drift

See `.claude/rules/development_rules.md` for full workflow rules.

---

## Architecture Reference

- Read `node_modules/next/dist/docs/` before writing Next.js code — this version has breaking changes
- Always use App Router patterns, never Pages Router
- All i18n via `next-intl` from day one — no hardcoded Dutch strings without i18n keys
- Database access only through Supabase client, never raw SQL strings in components

---

## Communication Rules

**All explanations to the project owner must be written in simplified Chinese (简体中文).**

- 所有面向项目负责人的解释、分析、风险提示、决策说明、实现总结，必须用简体中文书写。
- 代码（Code）本身保持英文，文件名（File names）保持英文，终端命令（Terminal commands）保持英文。
- 如果必须使用英文技术术语，必须立即在括号内附上中文解释。
  - 示例：MVP（最小可行产品）、SSR（服务端渲染）、API（应用程序接口）、ORM（对象关系映射）、i18n（国际化）、SEO（搜索引擎优化）
- 不得输出仅有英文的大段说明性段落。
- 架构说明、风险分析、实现方案、阶段总结，必须以中文为主。
- 优先使用清晰易懂的表达，避免堆砌专业术语。
- 假设项目负责人是非母语英语读者，不熟悉英文技术文档习惯。

**实施前（Before implementation）：** 先用中文说明计划。
**实施后（After implementation）：** 先用中文总结结果。

See `.claude/rules/communication.md` for the full communication protocol.

---

## Business Guardrail

> **Ship real bookings in Utrecht first. Everything else is distraction.**

When in doubt: would this help a Utrecht customer book a massage today? If no, defer it.
