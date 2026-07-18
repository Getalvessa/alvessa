# Utrecht Massage Recruitment Production Smoke Test Runbook

> **Purpose:** Safe, **read-only** operational verification for Alvessa Production while the site is in **Utrecht Massage Recruitment** mode.
> **When to run:** After every Production deployment in recruitment mode; after stability incidents; before reviewing activation checklists.
> **Owner:** Founder or designated release engineer. Record pass/fail, timestamps, and evidence for each section.
> **Companion:** `docs/GA_RELEASE_CHECKLIST.md`.

---

## 1. Purpose and scope

This runbook verifies that Production continues to:

- Serve Utrecht Massage **recruitment** narrative (NL + EN).
- Keep **customer booking closed** and **provider supply hidden**.
- Retain **FULL HIDDEN** SEO (`noindex` + empty sitemap).
- Keep Login + Recruitment CTA reachable without opening booking.

It does **not** authorize booking, payment, Stripe Checkout, webhook tests, form submissions, or configuration changes.

---

## 2. Exact Production identity (current release)

| Field | Value |
|-------|-------|
| Project | `alvessa` |
| Project ID | `prj_Kozh7qF9fkh4KdN9coUVmM7kGcpN` |
| Production deployment | `dpl_4wNeKi8YV2FtWZ3V2fhGBFioVGQK` |
| Deployment URL | https://alvessa-jmfsf89h0-alvessa.vercel.app |
| Domains | https://alvessa.nl · https://www.alvessa.nl |
| Release source commit (content reference) | `9282d4b8274040d4b2a7102eae5fd30a66e8573a` |
| Branch | `release/rc-3` |
| Mode | Utrecht Massage Recruitment |
| Deploy method | CLI-uploaded fresh Production build (Preview **not** promoted) |
| Vercel Git-SHA metadata | **Unavailable** (no Commit/SHA field on this deployment) |
| Traceability | **Content-based** against commit `9282d4b` (release-feature fingerprints) — **not** Vercel Git-SHA / Git-integration identity |
| Rollback reference | `dpl_EncDtwtPuvy373CKLsSUcmpF7RU5` |

Before smoking a newer deploy, replace the deployment ID and content-reference commit rows with the values under test. Do not assume this table stays current forever. Do **not** describe this Production deploy as “SHA-linked” or “Git-integration built” unless Vercel metadata actually contains a Commit/SHA field.

---

## 3. Preconditions

- [ ] Confirm Vercel project = `alvessa` / `prj_Kozh7qF9fkh4KdN9coUVmM7kGcpN`.
- [ ] Confirm Production deployment ID under test.
- [ ] Confirm `alvessa.nl` aliases point at that Production deployment.
- [ ] Confirm release mode is still **recruitment** (booking not publicly open).
- [ ] Use a normal browser User-Agent for page fetches (bot challenges may distort results).
- [ ] Have access to Vercel deployment logs (read-only).

**Do not** paste secrets, tokens, cookies, env values, or bypass parameters into this document or into chat logs.

---

## 4. Strict no-write policy

During **current recruitment** smoke tests, **FORBIDDEN**:

- Submitting the therapist application (`/voor-masseurs/aanmelden`).
- Creating an account solely for smoke testing.
- Logging in with a real provider/admin account unless a **separate** task explicitly approves it.
- Booking, payment, or Stripe Checkout (test or live).
- Triggering webhooks.
- Sending email.
- Database writes of any kind.
- Changing `publicVisible`, cities, sitemap, robots, Stripe, Supabase, env, domains, aliases, or Deployment Protection.
- Testing a provider slug as a “bypass” while cities are non-public.
- Promoting / rolling back / redeploying (unless a separate authorized deployment task grants it).

---

## 5. NL route matrix (read-only)

Record initial status, redirect chain, final status, final host, redirect count, loop?, 500?.

| # | Path | Expect | Pass |
|---|------|--------|------|
| □ | `/` | 200; `lang=nl`; recruitment; noindex | |
| □ | `/inloggen` | 200; login page loads (do not authenticate) | |
| □ | `/voor-masseurs` | 200; recruitment content | |
| □ | `/voor-masseurs/aanmelden` | 200; application UI loads (**do not submit**) | |
| □ | `/aanbod` | 200; coming-soon / not open; no public supply | |
| □ | `/massage-aan-huis-utrecht` | 200; coming-soon / recruitment; CTA → `/voor-masseurs` | |
| □ | `/deep-tissue-massage-utrecht` | 200; same landing rules | |
| □ | `/hotel-massage-utrecht` | 200; same landing rules | |
| □ | `/sportmassage-utrecht` | 200; same landing rules | |
| □ | `/faq` | 200 | |
| □ | `/over-ons` | 200 | |
| □ | `/contact` | 200 | |
| □ | `/hoe-het-werkt` | 200 | |

**Also required:** no redirect loop; final host remains `alvessa.nl` (not Preview `*.vercel.app`, not localhost).

---

## 6. EN route matrix (read-only)

| # | Path | Expect | Pass |
|---|------|--------|------|
| □ | `/en` | 200; `lang=en`; recruitment; noindex | |
| □ | `/en/inloggen` | 200; login page loads (do not authenticate) | |
| □ | `/en/voor-masseurs` | 200; recruitment content | |
| □ | `/en/voor-masseurs/aanmelden` | 200; application UI loads (**do not submit**) | |
| □ | `/en/aanbod` | 200; coming-soon / not open; no public supply | |
| □ | `/en/massage-aan-huis-utrecht` | 200; coming-soon / recruitment; CTA → `/en/voor-masseurs` | |
| □ | `/en/deep-tissue-massage-utrecht` | 200; same landing rules | |
| □ | `/en/hotel-massage-utrecht` | 200; same landing rules | |
| □ | `/en/sportmassage-utrecht` | 200; same landing rules | |
| □ | `/en/faq` | 200 | |
| □ | `/en/over-ons` | 200 | |
| □ | `/en/contact` | 200 | |
| □ | `/en/hoe-het-werkt` | 200 | |

---

## 7. Header and CTA checks

| # | Check | Expect | Pass |
|---|-------|--------|------|
| □ | NL header Login | Visible label **Inloggen** → `/inloggen` | |
| □ | NL header Recruitment CTA | Visible label **Aanmelden** → `/voor-masseurs` | |
| □ | EN header Login | Visible label **Log in** → `/en/inloggen` | |
| □ | EN header Recruitment CTA | Visible label **Apply** → `/en/voor-masseurs` | |
| □ | Provider nav/footer CTA | Points to masseur recruitment, not customer booking checkout | |
| □ | Homepage primary narrative CTA | Recruitment / coming-soon — **not** “book now” | |

Logged-in Header runtime is **out of scope** unless separately approved.

---

## 8. Recruitment narrative checks

| # | Check | Expect | Pass |
|---|-------|--------|------|
| □ | Public narrative | Utrecht Massage Recruitment / building supply | |
| □ | Customer appointments | Explicitly **not open** / coming soon | |
| □ | No bookable therapist claim | No real therapist presented as bookable | |
| □ | No guaranteed income/customers on `/voor-masseurs` | No false guarantee language | |
| □ | Approval ≠ immediate public availability | Application/approval does not imply public booking is live | |

---

## 9. `/aanbod` empty-state checks

| # | Check | Expect | Pass |
|---|-------|--------|------|
| □ | Empty / coming-soon state | No public provider cards/supply | |
| □ | CTA | Points to therapist recruitment (`/voor-masseurs`) | |
| □ | No booking CTA | No path that claims immediate public booking | |
| □ | City gate reminder | Public listing uses city/`publicVisible` allowlist; empty allowlist ⇒ no public providers | |

### Provider slug gating (critical correction)

`fetchPublicProviderBySlug` and public booking-provider access are **city / public-visibility gated**.

- While Utrecht (and other cities) have `publicVisible=false`, a known provider slug is **not** a valid public bypass.
- Do **not** document or execute “open `/aanbod/<known-slug>` to force a booking test” in recruitment mode.
- Booking-path tests belong only in the deferred section below, after explicit activation approval.

---

## 10. Historical Utrecht landing checks

For each of:

- `/massage-aan-huis-utrecht` (+ `/en/...`)
- `/deep-tissue-massage-utrecht` (+ `/en/...`)
- `/hotel-massage-utrecht` (+ `/en/...`)
- `/sportmassage-utrecht` (+ `/en/...`)

| # | Check | Expect | Pass |
|---|-------|--------|------|
| □ | Narrative | Recruitment / coming soon | |
| □ | CTA | `/voor-masseurs` (EN: `/en/voor-masseurs`) | |
| □ | No immediate-booking claim | No “book now” / open appointments claim | |
| □ | Structured data | No Offer, priceRange, or availability claim | |
| □ | robots | `noindex` retained | |

---

## 11. SEO containment checks

| # | Control | Expect | Pass |
|---|---------|--------|------|
| □ | `/robots.txt` | 200; allows public crawl; disallows private/auth/booking paths; policy unchanged | |
| □ | `/sitemap.xml` | 200; valid XML; **zero** `<url>` entries | |
| □ | Public page meta robots | `noindex, follow` (or equivalent noindex) on required public pages | |
| □ | www canonical | `www.alvessa.nl` → `alvessa.nl` (308/301 then 200) | |

Do **not** remove noindex or populate sitemap from this runbook.

---

## 12. Production log checks

Inspect recent logs for the Production deployment under test (read-only).

| # | Finding class | Action |
|---|---------------|--------|
| □ | Application error (500, crash, missing Supabase init, repeated route exceptions) | **P0/P1** — stop; escalate |
| □ | Missing Production configuration errors | **P1** — stop; escalate |
| □ | Unexpected Stripe/webhook activity caused by this smoke run | Should be **none** (this runbook is no-write) |
| □ | Unexpected booking / application / email / DB writes | Should be **none** |
| □ | Bot / 404 noise | Usually ignore unless spike correlates with regression |
| □ | Auth challenge / expected redirects on protected routes | Expected when not logging in |
| □ | Vercel/platform noise | Classify; no action if no user impact |

Required result for a PASS: no recurring application-level P0/P1 issue; no missing Production configuration; no rollback trigger from this monitoring window.

---

## 13. Failure severity

| Severity | Examples | Required response |
|----------|----------|-------------------|
| **P0** | Public booking/supply accidentally enabled; payment write; data leak; wrong project/domain | Stop immediately; escalate; do not continue checklist as PASS |
| **P1** | Core route 500; redirect loop; missing Supabase initialization; locale failure; noindex lost; non-empty sitemap | Stop; escalate; treat as release failure |
| **P2** | Incorrect recruitment CTA; misleading booking claim; broken secondary page | Fail section; schedule fix; do not claim full PASS |
| **P3** | Minor copy/layout inconsistency | Note; non-blocking for recruitment stability |

---

## 14. Rollback triggers

Mandatory investigation / rollback-consideration triggers:

- Homepage or `/en` returns non-200.
- Redirect loop.
- Application 500 on core routes.
- Missing Supabase public initialization configuration.
- Incorrect NL/EN routing / `lang`.
- Customer booking or Utrecht provider supply becomes publicly available.
- `noindex` disappears on required public pages.
- Sitemap becomes non-empty.
- Main CTA points to public booking as if open.
- Production alias points to the wrong project/deployment.

**Rollback reference:** `dpl_EncDtwtPuvy373CKLsSUcmpF7RU5`.

**Authorization:** Rollback requires **separate authorization**, unless an active deployment task already grants automatic rollback under defined conditions. This runbook alone does **not** authorize rollback.

---

## 15. Evidence template

```
Run date:
Operator:
Production deployment ID:
Release source commit (content reference):
Traceability note (content-based / Vercel Git-SHA unavailable):
Probe rounds (count / interval):
NL matrix: PASS / FAIL
EN matrix: PASS / FAIL
Header/CTA: PASS / FAIL
/aanbod empty-state: PASS / FAIL
Landings: PASS / FAIL
SEO containment: PASS / FAIL
Logs: PASS / FAIL (notes)
P0/P1 findings: none / <list>
Overall: PASS / FAIL
Rollback required?: No / Escalate for authorization
```

---

## 16. Deferred booking tests

### `DO NOT EXECUTE UNTIL BOOKING ACTIVATION IS EXPLICITLY APPROVED`

The following belong to a **future** Utrecht booking-activation task — **not** recruitment smoke:

- Public `/aanbod` provider listing with real supply.
- Provider detail `/aanbod/[slug]` for a public city.
- Booking wizard + Stripe Checkout.
- Webhook confirmation and `payments` row checks.
- Email verification for ordinary bookings.

### Email behavior (current evidence; do not over-claim)

Supported by current application email helpers:

- **Customer** booking confirmation (`sendCustomerConfirmation`).
- **Provider** new-booking notification (`sendProviderNotification`).

**Admin (`ADMIN_EMAIL`)** is used for **exceptional operational alerts** (e.g. manual-refund-required path), **not** documented here as a normal “every booking emails Admin” behavior.

When booking activation is approved, verify email expectations against the code and runtime evidence in that task — do not copy obsolete Groningen GA assumptions.

### City gate reminder for future booking tests

Even after a therapist exists in data, public listing/detail remain gated by `getPublicCitySlugs()` / `publicVisible`. A known slug must not be treated as a bypass while the city is non-public.

---

## Sign-off

| Field | Value |
|-------|-------|
| Run date | |
| Operator | |
| Deployment ID / content-reference commit | |
| Environment | Production — Utrecht Massage Recruitment / FULL HIDDEN |
| Overall result | PASS / FAIL |
| Sections failed (if any) | |
| Rollback authorized/executed? | No / Yes (cite authorizing task) |

---

## Related documents

- `docs/GA_RELEASE_CHECKLIST.md` — recruitment release facts + deferred activation gates
- `docs/STATE.md` — operational state
- `docs/CURRENT_SPRINT.md` — active sprint scope
