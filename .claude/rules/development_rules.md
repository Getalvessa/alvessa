# Development Rules

## Core Principle

Build one module at a time. Validate it works. Then move to the next.

## Before Writing Any Code

先用简体中文说明（in Chinese first）:
1. **目标** — 这次改动要实现什么
2. **涉及文件** — 列出将被创建或修改的文件
3. **不会构建的内容** — 至少一项被排除在外的功能
4. **验收标准** — 如何确认任务完成
5. **风险检查** — 是否影响现有功能

## After Writing Code

先用简体中文总结（in Chinese first）:
1. **改动内容** — 逐文件说明
2. **测试方法** — 具体步骤
3. **剩余工作** — 下一个逻辑步骤
4. **MVP范围检查** — 确认没有范围偏移

## When to Ask vs Proceed

| Situation | Action |
|---|---|
| Small bug fix within current module | Proceed |
| Adding a UI component within scope | Proceed |
| New database table or schema change | Ask first |
| New third-party integration | Ask first |
| Feature not in current phase | Ask first |
| Anything touching payments or auth | Ask first, always |
| Refactor touching more than 3 files | Ask first |

## Never Do Without Asking

- Add new npm dependencies
- Change the database schema
- Modify Stripe configuration
- Add new environment variables
- Create new API routes outside current module
- Enable post-MVP features
