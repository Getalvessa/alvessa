# Sprint 1 Implementation Report — Groningen Cleaning MVP

> **Foundation version:** v2.2.1 (frozen)
> **Date completed:** 2026-07-01
> **Implementer:** Claude (sole implementation agent)
> **Sprint goal:** Enable Groningen as the first production cleaning city while preserving the existing platform architecture.

---

## Summary

Sprint 1 is complete. 4 files were changed (1 new, 3 modified). The implementation is minimal and correct — the existing generic marketplace architecture handled Groningen and the Cleaning category expansion almost entirely through existing dynamic patterns, exactly as designed.

**Build status:** ✅ `npm run lint` — 0 errors. ✅ `npm run build` — exit 0, all routes compiled.

---

## Files Modified

### 1. `supabase/migrations/202607010001_add_groningen_cleaning.sql` — **NEW FILE**

**Type:** New migration (append-only, wrapped in BEGIN/COMMIT)

**Summary of change:**

Four logical operations in one migration:

1. **DROP + re-ADD `providers_city_slug_check`** — extended the CHECK constraint from `('utrecht', 'amsterdam', 'rotterdam', 'den-haag')` to include `'groningen'`.
2. **DROP + re-ADD `provider_applications_city_slug_check`** — same extension for the applications table.
3. **INSERT one `service_categories` row** — `slug = 'cleaning'`, `name_nl = 'Schoonmaak'`, `name_en = 'Cleaning'`, `is_active = true`, `sort_order = 2`.
4. **INSERT five `services` rows** — linked to the new cleaning category via subquery on `slug = 'cleaning'`. No hardcoded UUIDs.

**Services seeded:**

| NL Name | EN Name | Duration | Price |
|---|---|---|---|
| Schoonmaak 2 uur | Cleaning 2 hours | 120 min | €79.00 |
| Schoonmaak 3 uur | Cleaning 3 hours | 180 min | €109.00 |
| Schoonmaak 4 uur | Cleaning 4 hours | 240 min | €139.00 |
| Dieptereiniging | Deep clean | 240 min | €169.00 |
| Einde huur schoonmaak | End of tenancy clean | 300 min | €199.00 |

Prices match the approved Sprint 1 Audit (2026-07-01). No descriptions seeded (nullable; Sprint 2 debt).

**Rollback block:** Included as SQL comment block at the top of the file.

---

### 2. `lib/cities.ts` — MODIFIED

**Type:** Additive — one new entry appended to the `CITIES` array.

**Change:**
```typescript
{
  slug: 'groningen',
  displayName: 'Groningen',
  status: 'prelaunch',
  publicVisible: false,
  recruitmentVisible: true,
}
```

**No function signatures changed.** All five helper functions (`getPublicCities`, `getPublicCitySlugs`, `getRecruitmentCities`, `getRecruitmentCitySlugs`, `isRecruitmentCitySlug`, `getCityDisplayName`) continue to work without modification. The `CityStatus` type union already included `'prelaunch'` — no TypeScript change needed.

**Groningen visibility:** `publicVisible: false` ensures Groningen does not appear on any public-facing surface (`/aanbod`, sitemap, provider profiles) until the future Sprint 8 flag flip.

---

### 3. `messages/nl.json` — MODIFIED

**Type:** Copy update — 2 string values updated.

**Key 1 — `forProviders.cityEvaluationNote`:**
- Before: `"...Utrecht, Amsterdam, Rotterdam en Den Haag..."`
- After: `"...Utrecht, Amsterdam, Rotterdam, Den Haag en Groningen..."`

**Key 2 — `forProviders.applyCityHelper`:**
- Before: `"...We evalueren momenteel Utrecht, Amsterdam, Rotterdam en Den Haag."`
- After: `"...We evalueren momenteel Utrecht, Amsterdam, Rotterdam, Den Haag en Groningen."`

---

### 4. `messages/en.json` — MODIFIED

**Type:** Copy update — 2 string values updated (English equivalents of the NL changes).

**Key 1 — `forProviders.cityEvaluationNote`:**
- Before: `"...Utrecht, Amsterdam, Rotterdam and Den Haag..."`
- After: `"...Utrecht, Amsterdam, Rotterdam, Den Haag and Groningen..."`

**Key 2 — `forProviders.applyCityHelper`:**
- Before: `"...We are currently evaluating Utrecht, Amsterdam, Rotterdam and Den Haag."`
- After: `"...We are currently evaluating Utrecht, Amsterdam, Rotterdam, Den Haag and Groningen."`

---

## Migration Summary

| Property | Value |
|---|---|
| Migration file | `supabase/migrations/202607010001_add_groningen_cleaning.sql` |
| Migration number | 026 |
| Transaction | Wrapped in BEGIN / COMMIT |
| Rollback block | Included as SQL comment |
| Schema changes | CHECK constraints on `providers.city` and `provider_applications.city` |
| Seed data | 1 service_category row + 5 services rows |
| RLS changes | None |
| Data destroyed | None |
| Tables affected | `providers`, `provider_applications`, `service_categories`, `services` |

---

## Deployment Order

> ⚠️ **ADR-0001 exception applies here.** The normal "code first, migration second" rule does NOT apply to this migration.

**Correct production deployment order:**

1. **Apply the Supabase migration** (`202607010001_add_groningen_cleaning.sql`) to the production database.
2. **Verify** in the Supabase production dashboard that `providers_city_slug_check` and `provider_applications_city_slug_check` both contain `'groningen'`.
3. **Promote the Vercel deployment** containing the code changes (`lib/cities.ts`, `messages/nl.json`, `messages/en.json`) to production.

**Rationale:** All four code files must ship in the same Vercel deployment. The migration must precede that deployment to prevent a CHECK constraint violation window.

---

## Regression Checks Performed

See `docs/SPRINT_1_REGRESSION_REPORT.md` for the full checklist. Summary:

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors |
| `npm run build` (production) | ✅ exit 0, all routes compiled |
| `lib/cities.ts` helper function logic review | ✅ All functions unmodified, correct |
| Existing Utrecht city gating | ✅ Not affected (`publicVisible` unchanged) |
| Groningen public gating | ✅ Excluded from public surfaces (`publicVisible: false`) |
| Existing i18n keys | ✅ No keys renamed, no keys removed |
| Existing seed data | ✅ No existing rows modified |

---

## Unexpected Discoveries

None. The implementation matched the Sprint 1 Audit exactly. No surprises.

---

## Known Limitations (Carried Forward from Audit)

### Limitation 1 — `dashboard/diensten` shows all categories (Debt 1)

After this migration, the `app/[locale]/dashboard/diensten/page.tsx` `getServicesData()` query fetches ALL active services without category filtering. Any existing massage provider visiting `/dashboard/diensten` will see cleaning services listed alongside massage services.

**Sprint 1 impact:** None — no active providers exist in production. Visual contamination only.
**Must fix:** Sprint 2 or Sprint 3, before any cleaning provider is onboarded.

### Limitation 2 — `lib/types/marketplace.ts` stale comment (Debt 2)

`Provider.city` comment still reads `// 'Utrecht' for MVP`. Non-blocking documentation debt.

### Limitation 3 — `voor-masseurs/page.tsx` Utrecht/massage-only copy (Debt 3)

The page remains Utrecht/massage-specific. Cleaning partners will use `/voor-schoonmakers` in Sprint 3.

### Limitation 4 — Service descriptions not seeded

`description_nl` and `description_en` for the 5 cleaning services were not seeded (both columns are nullable). Descriptions can be added in a future migration without Sprint 1 regression.

---

## Files NOT Modified (Verified)

The following files were confirmed to require zero changes due to existing dynamic patterns:

- `app/[locale]/voor-masseurs/aanmelden/application-form.tsx` — dynamic, reads `getRecruitmentCities()`
- `app/[locale]/voor-masseurs/aanmelden/actions.ts` — dynamic, uses `isRecruitmentCitySlug()`
- `lib/providers/public.ts` — Groningen excluded automatically via `publicVisible: false`
- `app/[locale]/aanbod/page.tsx` — gated by public city filter
- `app/[locale]/admin/aanbieders/applications-list.tsx` — uses `getCityDisplayName()`, handles new slugs automatically
- `lib/types/database.ts` — city typed as `string`, no TypeScript union change needed
- All booking/payment/auth files — zero changes
- `app/sitemap.ts` — Groningen is not public; no update needed
