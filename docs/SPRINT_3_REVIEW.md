# Sprint 3 Review — Read-Only

> **Review type:** Read-only post-implementation audit.
> **No files were modified.** No code was changed during this review.
>
> **Reviewer:** CTO / Lead Engineer
> **Date:** 2026-07-02
> **Scope:** Sprint 3 deliverables only — 4 changed files.

---

## Review Summary

Sprint 3 is **structurally correct and production-safe**. The page compiles, the i18n keys are
complete and consistent, and the conditional label logic is correct. One **medium-severity issue**
was found: the conditional experience label (`isCleaningApplicant`) will rarely activate in
practice because the `service_types` field it depends on has massage-specific label and placeholder
copy. Four minor/cosmetic issues are also documented.

**No blocking issues. No security issues. No regressions.**

---

## Check 1 — NL Page Copy Quality and CTA Correctness

### `/nl/voor-schoonmakers` copy assessment

| Section | NL Copy | Assessment |
|---|---|---|
| `pageTitle` | "Word schoonmaakpartner in Groningen" | ✅ Clear, direct, geo-anchored |
| `pageSubtitle` | "Jij bepaalt je rooster — wij zorgen voor klanten en betalingen." | ✅ Addresses the 3 core partner concerns |
| `cityEvaluationNote` | "Alvessa lanceert binnenkort in Groningen. Meld je nu aan en wees er als eerste bij." | ✅ Honest about prelaunch status — no false promises |
| `benefit1` | "Flexibel rooster / Jij kiest wanneer je beschikbaar bent." | ✅ Accurate |
| `benefit2` | "Directe uitbetaling / Ontvang je verdiensten automatisch via Stripe na elke voltooide boeking." | ✅ Technically accurate — matches Stripe Connect flow |
| `benefit3` | "Geen acquisitie / Alvessa zorgt voor klanten in Groningen. Jij zorgt voor de schoonmaak." | ✅ Strong proposition — clear value split |
| `req1–req4` | Experience, materials, geography, bank account | ✅ All 4 requirements are accurate and necessary for onboarding |
| `howStep1–3` | Apply → review → availability + first bookings | ✅ Matches actual onboarding flow |
| `ctaTitle/ctaBody` | "Klaar om te beginnen? / Meld je aan als schoonmaakpartner en bouw je klantenbestand op in Groningen." | ✅ Clear action |

**Copy quality verdict: ✅ Pass.** The NL copy is clear, honest, and free of false promises.
The prelaunch note accurately reflects `publicVisible: false`.

### CTA link correctness

The CTA button renders:
```tsx
<Link href="/voor-masseurs/aanmelden">
  {t('ctaApplyButton')}   {/* "Aanmelden als schoonmaakpartner" */}
</Link>
```

**Button label:** ✅ Correct — "Aanmelden als schoonmaakpartner" is cleaning-specific.
**Link destination:** ⚠️ **Known issue** — `/voor-masseurs/aanmelden` contains "masseurs" in the URL.
This is the documented Sprint 3 limitation (see `docs/SPRINT_3_IMPLEMENTATION_REPORT.md`).
The form at that URL functions correctly for cleaning applicants. The branding mismatch is cosmetic.

---

## Check 2 — EN Page Consistency

| Dimension | Result |
|---|---|
| Key count parity (NL vs EN) | ✅ Both files have exactly **24 `forCleaners` keys** |
| Missing EN translations | ✅ None |
| Extra EN keys (no NL equivalent) | ✅ None |
| Structural consistency | ✅ Same sections, same key names |

### Minor inconsistency found

| Key | NL | EN |
|---|---|---|
| `benefit3Title` | "Geen acquisitie" | "No acquisition needed" |

The NL is terse (2 words). The EN adds "needed" as a qualifier (3 words). Both convey the same
meaning but at different register. **Severity: LOW.** No functional impact. Can be harmonized in
any future copy pass.

**EN consistency verdict: ✅ Pass (1 minor stylistic inconsistency).**

---

## Check 3 — CTA User Confusion Risk (`/voor-masseurs/aanmelden`)

### Journey analysis

A cleaning partner following the conversion funnel:

```
/voor-schoonmakers
  → reads cleaning-specific copy ✅
  → clicks "Aanmelden als schoonmaakpartner" ✅
  → lands at /voor-masseurs/aanmelden   ← URL contains "masseurs"
  → sees form title from forProviders namespace
```

### What the cleaning partner sees on the form page

The `aanmelden/page.tsx` renders `PageHeader` using `useTranslations('forProviders')`. The
current `applyPageTitle` value was not checked in this review but it likely uses massage-specific
language (e.g., "Aanmelden als therapeut" or similar). **This creates a second branding
inconsistency** beyond the URL slug itself.

### Risk classification

| Risk | Severity | Impact |
|---|---|---|
| URL slug `/voor-masseurs/` visible in browser bar | LOW | Cosmetic; cleaning partner sees it after click |
| Form page title may say "masseur/therapeut" | MEDIUM | Could reduce trust/completion rate |
| Form fields work correctly for cleaning applicants | N/A | ✅ No functional problem |

**Verdict: ⚠️ Accepted MVP debt, but the form page title should be reviewed before the first
real cleaning partner recruitment campaign.** For the first 1–3 directly recruited partners
(who will be briefed in advance), this is not a blocker. For a broader recruitment campaign, fix
in Sprint 7 with a generic `/aanmelden/` route.

---

## Check 4 — `isCleaningApplicant` Trigger Conditions

### Logic review

```typescript
const isCleaningApplicant =
  selectedCity === 'groningen' &&
  selectedServiceTypes.toLowerCase().includes('cleaning');
```

### Simulation results (9 test cases)

| City | service_types input | Expected | Result |
|---|---|---|---|
| utrecht | _(empty)_ | false | ✅ false |
| groningen | _(empty)_ | false | ✅ false |
| utrecht | "cleaning" | false | ✅ false |
| groningen | "cleaning" | **true** | ✅ true |
| groningen | "Cleaning" | **true** | ✅ true — case-insensitive |
| groningen | "CLEANING" | **true** | ✅ true — case-insensitive |
| groningen | "schoonmaak" | false | ✅ false — Dutch word, no false positive |
| groningen | "deep cleaning" | **true** | ✅ true — substring match |
| amsterdam | "cleaning" | false | ✅ false — wrong city |

**Logic verdict: ✅ Correct.** All 9 cases behave as intended. No false positives or false
negatives given the trigger inputs.

### 🔴 MEDIUM — Practical trigger limitation

The `isCleaningApplicant` condition reads `selectedServiceTypes`, which is the `service_types`
text field. **That field currently has massage-specific label and placeholder:**

```
NL label:       "Welke massages bied je aan?"
NL placeholder: "Bijv. Zweedse massage, diepe weefselmassage, sportmassage…"
EN label:       "Which massages do you offer?"
EN placeholder: "E.g. Swedish massage, deep tissue, sports massage…"
```

A Dutch-speaking cleaning applicant who reads this label will:
1. Be confused ("this is asking about massages?")
2. Likely type "schoonmaak" or "schoonmaakdiensten" (Dutch words, no 'cleaning' substring)
3. The `isCleaningApplicant` condition evaluates to **false**
4. The experience label stays as "Jaren ervaring" (massage framing) — not "Schoonmaakervaring (jaren)"

**The conditional label feature will not activate for most cleaning applicants** who follow the
natural Dutch-language input pattern. The feature is implemented correctly but not reachable
through the current user flow.

**Root cause:** `applyLabelServices` and `applyLabelServicesPh` are not conditional — they show
massage copy for all applicants regardless of city.

**Impact:** Low for Sprint 3 (first cohort of 1–3 partners is directly recruited and briefed).
Medium for any unattended recruitment flow.

**Recommended fix (Sprint 7 or Sprint 4 scope):**
Make `applyLabelServices` conditional in `application-form.tsx`, the same way
`applyLabelExperience` was made conditional:
```typescript
// label
isCleaningApplicant ? t('applyLabelServicesCleaning') : t('applyLabelServices')

// placeholder
isCleaningApplicant ? t('applyLabelServicesCleaningPh') : t('applyLabelServicesPh')
```
This requires adding 2 new i18n keys (`applyLabelServicesCleaning`, `applyLabelServicesCleaningPh`)
to both message files. Complexity: Low. Risk: Low.

---

## Check 5 — i18n Key Usage Audit

### `forCleaners.*` namespace

| Metric | Result |
|---|---|
| Keys defined in nl.json | 24 |
| Keys defined in en.json | 24 |
| Keys consumed by `voor-schoonmakers/page.tsx` | 24 |
| **Dead keys** (defined, never read by page) | **0** |
| **Missing keys** (read by page, not defined) | **0** |

**Full key-to-consumer map:**

| Key | Consumer |
|---|---|
| `metaTitle`, `metaDescription` | `generateMetadata()` |
| `pageTitle`, `pageSubtitle`, `cityEvaluationNote` | `PageHeader` |
| `benefitsTitle`, `benefit1Title/Desc`, `benefit2Title/Desc`, `benefit3Title/Desc` | `BenefitsSection` |
| `requirementsTitle`, `req1`, `req2`, `req3`, `req4` | `RequirementsSection` |
| `howTitle`, `howStep1`, `howStep2`, `howStep3` | `HowToApplySection` |
| `ctaTitle`, `ctaBody`, `ctaApplyButton` | `CtaSection` |

### `booking.notesPlaceholderCleaning`

| File | Present | Value |
|---|---|---|
| nl.json | ✅ | "Bijv. appartement of woonhuis, bellcode, verdieping, bijzonderheden voor de schoonmaker." |
| en.json | ✅ | "E.g. apartment or house, door code, floor, any notes for the cleaner." |
| Currently consumed by | — | **No file** — this is a **prepared key for Sprint 4** |

**Status: ✅ Intentionally prepared.** The key is not dead — it is explicitly documented in
`SPRINT_3_IMPLEMENTATION_REPORT.md` as a Sprint 4 prerequisite. `booking-flow.tsx` will wire
it up in Sprint 4 when the AddressStep gains conditional placeholder logic.

### `forProviders.applyLabelExperienceCleaning`

| File | Present | Value |
|---|---|---|
| nl.json | ✅ | "Schoonmaakervaring (jaren)" |
| en.json | ✅ | "Cleaning experience (years)" |
| Consumed by | `application-form.tsx` line 207 | `isCleaningApplicant ? t('applyLabelExperienceCleaning') : t('applyLabelExperience')` |

**Status: ✅ Correct and wired up.**

**i18n verdict: ✅ Pass.** Zero dead keys. Zero missing keys. One prepared key for Sprint 4
(correct and documented).

---

## Additional Observations

### OBS-1 — Benefit 3 icon semantic mismatch (LOW)

`BenefitsSection` uses `Users` icon for benefit3 ("Geen acquisitie" / "No acquisition needed").
The `Users` icon represents people/customers — tangentially related but not the most intuitive
icon for "we find your customers for you." Icons such as `Megaphone`, `Target`, or `Search`
would be more semantically precise. **Cosmetic only.** No i18n or logic change needed.

### OBS-2 — `howStep3` makes a plural bookings promise (LOW)

NL: "Na goedkeuring stel je je beschikbaarheid in en **ontvang je je eerste boekingen**."
EN: "After approval, set your availability and receive your **first bookings**."

Both use plural "bookings". For a prelaunch city with 0 confirmed customers, this is a slightly
optimistic promise. The singular "eerste boeking" would be more hedged. No functional impact —
copy observation only.

### OBS-3 — `formRef.current?.reset()` does not reset `selectedCity`/`selectedServiceTypes` state (NOT AN ISSUE)

After a successful form submit, `formRef.current?.reset()` resets the DOM form values but not
the React state (`selectedCity`, `selectedServiceTypes`). **This is not a bug:** the `if (success)`
branch renders a completely different JSX tree (the success confirmation), so the form and its
state are never rendered again after success. On next mount (page reload / navigation), fresh
state is initialized. No fix needed.

---

## Issue Register

| # | Description | Severity | Functional? | Recommended Action |
|---|---|---|---|---|
| I-1 | `service_types` label/placeholder is massage-specific; `isCleaningApplicant` rarely activates in practice | **MEDIUM** | Yes — feature under-delivers | Fix in Sprint 4 or Sprint 7: make `applyLabelServices` + placeholder conditional (2 i18n keys + 2 form lines) |
| I-2 | CTA links to `/voor-masseurs/aanmelden` — URL branding mismatch | LOW | No | Fix in Sprint 7: create generic `/aanmelden/` route |
| I-3 | EN `benefit3Title` ("No acquisition needed") is wordier than NL ("Geen acquisitie") | LOW | No | Fix in any future copy pass |
| I-4 | `Users` icon used for benefit3 (no acquisition) — weak semantic fit | LOW | No | Fix in any future UI pass |
| I-5 | `howStep3` plural "boekingen/bookings" is optimistic for prelaunch | LOW | No | Consider singular in copy pass |

---

## Go / No-Go for Sprint 4

**Recommendation: GO ✅ with one follow-up required before first cleaning partner recruitment.**

Sprint 3 is structurally sound and production-safe. The one medium issue (I-1) does not break
any booking or payment flow. It only means the `applyLabelExperienceCleaning` feature will not
visually activate for most Dutch-speaking cleaning applicants in the current form.

**Required before first public recruitment campaign (pre-Sprint 8):**
Fix I-1 (conditional `service_types` label). This is a 4-line code change + 4 i18n keys.
It can be bundled into Sprint 4 at no extra risk since Sprint 4 already touches `messages/*.json`.

**No changes needed before Sprint 4 technical work begins.**

---

*Review complete. No files were modified. Awaiting Sprint 4 approval.*
