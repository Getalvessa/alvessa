# Git Workflow

Rules for version control in this project. The goal is a clean, auditable history where any phase can be inspected or rolled back cleanly.

---

## Core Principle

**One phase = one stable, buildable commit.**

Each phase checkpoint commit must:
- Pass `npm run type-check` with zero errors
- Pass `npm run build` with zero errors
- Represent a complete, coherent state (not mid-feature)

---

## Commit Naming Rules

### Format

```
<type>(<scope>): <summary>
```

### Types

| Type | When to use |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `chore` | Infrastructure, config, tooling |
| `docs` | Documentation only |
| `refactor` | Code change with no behavior change |
| `test` | Tests only |
| `db` | Database migrations or schema changes |

### Phase Checkpoint Commits

Phase checkpoints use a special tag format:

```
chore: phase-N-<name>-approved
```

Examples:
```
chore: phase-1-foundation-approved
chore: phase-2-database-auth-approved
chore: phase-3-public-website-approved
chore: phase-4-booking-engine-approved
chore: phase-5-payments-approved
```

These commits are the rollback targets. They mark a state that has been reviewed and accepted.

### Regular Commits

```
feat(providers): add provider profile page
fix(booking): correct slot overlap calculation
db(migration): add bookings snapshot fields
chore(i18n): add Dutch translations for nav
docs(architecture): add role flags decision
```

---

## Migration Naming Rules

Supabase migrations are named with a timestamp prefix and a descriptive slug:

```
YYYYMMDDHHMMSS_<description>.sql
```

Examples:
```
20260512000001_create_profiles_table.sql
20260512000002_create_providers_table.sql
20260512000003_create_service_catalog.sql
20260512000004_create_availability_tables.sql
20260512000005_create_bookings_table.sql
20260512000006_create_payments_table.sql
20260512000007_create_reviews_table.sql
20260512000008_add_rls_policies.sql
20260512000009_add_btree_gist_exclusion_constraint.sql
20260512000010_seed_service_categories.sql
20260512000011_seed_services.sql
```

### Migration Rules

1. **Never modify a migration that has been applied to production.**
   If you need to change something, write a NEW migration.

2. **Each migration must be reversible** — include a `-- rollback:` comment block at the bottom describing how to undo it (even if the rollback is manual).

3. **One concern per migration file.** Do not combine "create table" and "add RLS policies" in the same file.

4. **Migrations are committed immediately** when they are written, before they are applied to production. The commit message:
   ```
   db(migration): <describe what it does>
   ```

5. **Never rewrite migration history.** If a migration has been applied to any Supabase environment (local or remote), it is permanent. Write a corrective migration instead.

---

## Branch Strategy (MVP Phase)

For MVP, we work on a single `main` branch. No feature branches are required until the team grows.

```
main  ← only branch during MVP
```

When to create a branch:
- Risky database migrations (test on a branch, PR to main after local Supabase testing)
- Experimental UI changes that are not yet approved

---

## Checkpoint Strategy

### When to create a checkpoint commit

1. After a full phase is accepted (reviewed and tested)
2. Before starting any database migration
3. After all migrations for a phase are applied and verified
4. Before any major refactor

### How to create a checkpoint

```bash
# 1. Verify the build
npm run type-check
npm run build

# 2. Stage all relevant files
git add -A

# 3. Commit with checkpoint format
git commit -m "chore: phase-N-<name>-approved"

# 4. Optionally tag for easy reference
git tag phase-N-<name>
```

### How to roll back to a checkpoint

```bash
# View available checkpoints
git log --oneline

# Roll back working tree to a checkpoint (non-destructive)
git checkout <commit-hash> -- .

# Or reset to a checkpoint (destructive — use with caution)
git reset --hard <commit-hash>
```

---

## What NOT to Commit

| Item | Why |
|---|---|
| `.env.local` | Contains secrets |
| `.env.production` | Contains secrets |
| `node_modules/` | Rebuilt from package.json |
| `.next/` | Build artifact |
| `supabase/.temp` | Supabase local state |
| Real user data | GDPR |
| Stripe live keys | Security |

The `.env.local.example` file **is** committed — it contains only placeholder values and documents what variables are needed.

---

## Rollback Decision Guide

| Situation | Action |
|---|---|
| Bug in current feature, not committed | Discard changes (`git checkout -- .`) |
| Bug found after commit, before phase checkpoint | Fix forward with a new commit |
| Catastrophic bug after phase checkpoint | Roll back to previous checkpoint commit |
| Bad migration applied to local Supabase | Write a corrective migration |
| Bad migration applied to production | Emergency: write corrective migration + notify stakeholders |

**Never force-push to `main`.** If history needs to be corrected, use a corrective commit.
