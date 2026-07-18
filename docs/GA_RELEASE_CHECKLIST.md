# Utrecht Massage Recruitment Release Checklist

> **Purpose:** Operational release checklist for the live **Utrecht Massage Recruitment** Production mode.
> **Not** a Groningen Booking GA checklist. Customer booking activation, Stripe Live, and SEO indexing are **separate founder-gated milestones**.
> **Companion:** `docs/SMOKE_TEST_RUNBOOK.md` (read-only recruitment smoke).
> **Authority:** Founder written approval required before any of: `publicVisible=true`, Stripe Live, noindex removal, sitemap population, or public booking launch.

---

## A. Completed release facts

| Item | Value |
|------|-------|
| Release mode | Utrecht Massage Recruitment |
| Production project | `alvessa` (`prj_Kozh7qF9fkh4KdN9coUVmM7kGcpN`) |
| Production deployment | `dpl_4wNeKi8YV2FtWZ3V2fhGBFioVGQK` |
| Deployment URL | https://alvessa-jmfsf89h0-alvessa.vercel.app |
| Production domains | https://alvessa.nl · https://www.alvessa.nl |
| Release source commit (content reference) | `9282d4b8274040d4b2a7102eae5fd30a66e8573a` |
| Source branch | `release/rc-3` |
| Rollback reference (previous Production) | `dpl_EncDtwtPuvy373CKLsSUcmpF7RU5` |
| Deploy method | CLI-uploaded fresh Production build (Preview **not** promoted) |
| Vercel Git-SHA metadata | **Unavailable** for this deployment (no Commit/SHA field in deployment metadata) |
| Traceability | **Content-based** — Production HTML/features verified against release commit `9282d4b` via release-feature fingerprints; **not** cryptographic or Vercel Git-SHA identity |

| # | Fact | Status |
|---|------|--------|
| [x] | Utrecht Massage Recruitment narrative is live on Production (NL + EN) | verified |
| [x] | Mobile Header exposes Login + Recruitment CTA (NL: Inloggen + Aanmelden; EN: Log in + Apply) | verified |
| [x] | Primary provider CTA routes to `/voor-masseurs` (EN: `/en/voor-masseurs`) | verified |
| [x] | `/aanbod` shows coming-soon / bookings-not-open empty state (no public provider supply) | verified |
| [x] | Historical Utrecht landings use recruitment / coming-soon language; CTA → `/voor-masseurs` | verified |
| [x] | Public pages retain `noindex, follow` | verified |
| [x] | Sitemap remains empty (`<url>` count = 0) | verified |
| [x] | Structured data on checked public pages has no Offer / priceRange / availability claim | verified |
| [x] | NL pages emit `<html lang="nl">`; EN pages emit `<html lang="en">` | verified |
| [x] | Production post-deploy smoke + stability monitoring passed for this release | verified |
| [x] | Groningen implementation, routes, and data remain preserved in the codebase (not deleted) | verified |
| [x] | Stripe Live was **not** activated as part of this release | verified |
| [x] | SEO indexing was **not** enabled as part of this release | verified |

---

## B. Recruitment-mode safeguards (must remain true)

These are **current Production invariants**. Do not flip them without a dedicated approval task.

| # | Safeguard | Status |
|---|-----------|--------|
| [x] | Customer booking remains **closed** (public narrative: appointments not open) | verified |
| [x] | Utrecht `publicVisible` remains **`false`** — Utrecht is **not** a public booking city | verified |
| [x] | No real / bookable Utrecht massage therapist is represented as available to customers | verified — **BLOCKED** on supply |
| [x] | City / public-visibility gating remains enforced for public provider listing and slug access (`fetchPublicProviders` / `fetchPublicProviderBySlug`) | verified |
| [x] | A known provider slug is **not** a valid public bypass while `publicVisible=false` | verified |
| [x] | FULL HIDDEN SEO: public `noindex` + empty sitemap | verified |
| [x] | Stripe remains in **test mode** infrastructure; Live keys not authorized for this release | verified |
| [x] | Therapist application form exists at `/voor-masseurs/aanmelden` but is **not** exercised by release smoke | policy |

---

## C. Deferred activation gates

Do **not** treat these as incomplete work for the recruitment release. They are **future** gates.

| # | Gate | Status |
|---|------|--------|
| [ ] | At least one real, approved, complete Utrecht massage therapist onboarded | **BLOCKED** — no bookable Utrecht therapist yet |
| [ ] | Provider schedule and services verified for that therapist | deferred |
| [ ] | Runtime provider detail + booking path regression (Utrecht Massage) | deferred |
| [ ] | Controlled test booking in the **intended** payment mode | deferred — **not** part of recruitment smoke |
| [ ] | Payment / webhook / email behavior verified for the intended mode | deferred |
| [ ] | Explicit founder approval before `publicVisible=true` for Utrecht | deferred — **not approved** |
| [ ] | Explicit founder approval for Stripe **Live** | deferred — **not approved** |
| [ ] | Explicit founder approval for SEO release (remove noindex / populate sitemap) | deferred — **not approved** |
| [ ] | Legal / product review if booking terms change before public booking | deferred |
| [ ] | New Production QA after any booking-activation deploy | deferred |
| [ ] | Logged-in Header runtime verification on Production | deferred — not verified in this release |

---

## D. Production verification (recruitment release)

Use `docs/SMOKE_TEST_RUNBOOK.md` after every Production deploy while in recruitment mode.

| # | Check | Status |
|---|-------|--------|
| [x] | Production deployment ID matches current release (`dpl_4wNeKi8YV2FtWZ3V2fhGBFioVGQK`) | verified 2026-07-18 |
| [x] | `alvessa.nl` / `www.alvessa.nl` serve recruitment Production (www → apex canonical) | verified |
| [x] | Core NL/EN routes return 200; no redirect loop; no Preview/localhost divert | verified |
| [x] | No recurring application 500 / missing Supabase init in post-deploy monitoring window | verified |
| [x] | Rollback reference recorded: `dpl_EncDtwtPuvy373CKLsSUcmpF7RU5` | recorded |

**Rollback note:** Restoring the previous Production deployment requires **separate authorization**, unless an active deployment task already grants automatic rollback.

---

## E. Future booking launch gates (not this release)

Only after Section C gates clear and founder approvals are written:

1. Confirm ≥1 real approved Utrecht massage therapist with verified schedule/services.
2. Run controlled booking + payment + webhook + email verification for the **approved** mode.
3. Obtain explicit approvals for: `publicVisible=true`, Stripe Live (if required), SEO indexing (if required).
4. Deploy activation changes in a dedicated task (not this recruitment release).
5. Re-run Production QA and rewrite smoke/checklist sections for booking mode.

### Explicit non-implications

This checklist must **not** be read as saying:

- A therapist is currently bookable on Production.
- A known provider slug bypasses city / `publicVisible` gating.
- Historical Stripe Test success means public booking is open.
- Every ordinary booking sends an Admin booking email (current code: customer + provider notifications; Admin `ADMIN_EMAIL` is used for exceptional refund/operational alerts).
- Groningen Booking GA is the current release.
- SEO is ready to index.
- `publicVisible` should be enabled now.

---

## Sign-off

| Field | Value |
|-------|-------|
| Recruitment Production deploy verified | [x] 2026-07-18 — `dpl_4wNeKi8YV2FtWZ3V2fhGBFioVGQK` (content-traced to `9282d4b`) |
| Booking activation approved | [ ] not approved |
| Stripe Live approved | [ ] not approved |
| SEO indexing approved | [ ] not approved |
| Operator | |
| Founder written approval (future gates) | _____________________ Date: ___________ |

---

## Related documents

- `docs/SMOKE_TEST_RUNBOOK.md` — Utrecht Recruitment Production smoke (read-only)
- `docs/STATE.md` — operational state / open debts
- `docs/CURRENT_SPRINT.md` — active sprint scope
- `CLAUDE.md` — Stripe Live and safety rules
