# S2-C MVP Validation — PropertyTypeSelector

> **Type:** Product and architecture assessment. Read-only.
> **Author:** CTO / Lead Engineer
> **Date:** 2026-07-02
> **Decision required:** Go / Defer before any S2-C implementation begins.

---

## 1. What business problem does the PropertyTypeSelector solve?

A cleaning booking has one variable the massage booking flow has never needed:
**the physical characteristics of the property being cleaned.**

A cleaner who arrives at the address without prior knowledge of property type faces:

- Uncertain supply planning (a 65 m² apartment vs a 4-bedroom house requires
  different quantities of cleaning agents)
- Unexpected scope (end-of-tenancy at an office suite vs a studio flat are
  materially different jobs)
- Possible renegotiation at the door — the single highest-risk moment for
  a first-booking cancellation and a trust failure

The selector solves this by capturing structured property type data at booking
time, storing it in `bookings.customer_notes`, and surfacing it to the cleaner
in their dashboard booking detail before they travel to the address.

**The problem is real. The question is whether a structured UI component is the
minimum viable solution — or whether a simpler mechanism is sufficient.**

---

## 2. What exactly breaks if the selector does not exist?

### Operational inconvenience
The cleaner must initiate a follow-up message (email, WhatsApp, platform message)
after every booking to ask the customer: "What type of property?" and "Any
specific instructions?"

For the first 10 bookings in Groningen — all of which will be manually overseen
by the platform operator — this is a manageable overhead. Estimated time cost:
**2–3 minutes per booking** for the cleaner or operator. Not zero, but not a
blocker.

### Customer confusion
The current booking notes field (Step 3, `address_notes`) has a massage-specific
placeholder: *"Bijv. bellcode, etage, voorkeur voor druk…"*

A Groningen cleaning customer reading this placeholder has no prompt to mention
property type. They may leave the field blank. This is a **copy problem**, not a
component problem. It is fully resolved by updating the placeholder i18n key —
a 2-line copy change, not a new UI component.

### Revenue impact
**None.** The customer has already committed to the booking and payment before
the cleaner needs to know the property type. No revenue is lost if the selector
is absent. The booking still completes. The payment still processes. The cleaner
still receives the job.

There is no conversion-gate scenario here: the customer is not asked for property
type before selecting a service or entering payment. The information is
operational context — it helps the cleaner, it does not unlock the booking.

### Technical limitation
**None.** The `bookings.customer_notes` column is nullable. The booking inserts
and Stripe checkout work identically with `customer_notes = null`. The availability
API, webhook, and email notifications are all unaffected. The dashboard booking
detail already renders `customer_notes` when present.

**Summary:** Without S2-C, zero things break technically or commercially.
One operational step is added per booking. One copy string is stale.

---

## 3. Can customer_notes collect the same information without S2-C?

**Yes — completely, via a 2-line i18n change already within S2-A scope.**

The booking flow `AddressStep` (Step 3) already contains a free-text notes
field that submits to `bookings.address_notes`. To collect property type:

**Option A — Update the existing notes placeholder (zero new code):**

Change `booking.notesPlaceholder` in `messages/nl.json` from:

```
"Bijv. bellcode, etage, voorkeur voor druk..."
```

to:

```
"Bijv. appartement of woonhuis, bellcode, verdieping..."
```

This prompts every cleaning customer to mention property type as a natural part
of the address step. No new component. No new state. No new form field. The
information arrives in `address_notes` alongside the door code.

**Option B — One dedicated `customer_notes` field in Step 3 (minimal addition):**

Add a single `<textarea>` to `AddressStep` for cleaning bookings with
placeholder: *"Type woning (appartement, woonhuis, studio) en bijzonderheden
voor de schoonmaker."*

This requires approximately 10 lines of code inside `AddressStep` — no new
component file, no category detection infrastructure, no `lib/providers/public.ts`
join change. It is a step-3 additive field, not a step-1 architectural change.

**Option A is the MVP path.** It requires zero new code and is achievable within
the i18n changes already made in S2-A (add one key:
`booking.notesPlaceholderCleaning`). Property type arrives as unstructured text —
acceptable for the first 10–20 bookings where the operator is in direct contact
with every cleaner.

---

## 4. Impact of deferring to Sprint 3 or Sprint 4

### Does it delay launch?

**No.** The 7 hard requirements for the first real Groningen booking
(`docs/EXECUTION_ROADMAP.md`, section "What Is the Minimum Implementation")
do not include a structured property type selector. This feature is absent from
that list entirely.

The critical path is:
```
S1 (done) → S2 → S4 (booking flow) → S5 (payments) → S8 (launch prep) → S9
```

S2-C as designed in `docs/EXECUTION_ROADMAP.md` is classified under S2
(Cleaning Category) as a booking flow UI enhancement. It is not a hard
dependency of S4 (booking flow correctness) or S5 (payments). S4's exit
criterion is: "Customer can complete a cleaning booking." That criterion is
met today with the existing booking flow + Option A placeholder copy change.

### Does it reduce conversion?

**Marginally, if at all.** The selector appears at Step 1 of the booking flow
(service selection). Research on multi-step checkout abandonment consistently
shows that adding friction at any step increases drop-off. A required radio
group at Step 1 before the customer has even chosen a time slot is an
**additional question the customer must answer before proceeding**. For the
first 10–20 real bookings, Option A (placeholder text) is less friction, not
more.

Structured selectors improve conversion when:
(a) the field is required, not optional, AND
(b) the customer already expects to answer it, AND
(c) skipping it causes downstream booking failures

None of (a), (b), or (c) apply here in MVP. Property type is operational
context for the cleaner, not a customer-facing decision point.

### Does it increase operational workload?

**Yes, slightly — for the first cohort of bookings only.**

With Option A (updated placeholder), the cleaner receives property type as a
free-text note in most cases. For the minority of customers who leave the field
blank, the cleaner or operator sends one follow-up message.

Estimated additional workload for the first 20 bookings: **30–40 minutes total
across the cohort.** At that scale, the operator is already in contact with
every cleaner by phone/WhatsApp. This is not a staffing problem.

Once the platform reaches 50+ bookings per week, a structured selector becomes
a genuine operational efficiency. That threshold is post-launch. The structured
selector belongs to that phase.

---

## 5. Foundation principle assessment

> **"Build only what is necessary to validate the marketplace."**

The PropertyTypeSelector as designed in S2-C is a **UX polish item**, not a
marketplace validator.

What S2-C validates: "Does a structured form reduce the rate of customers
providing incomplete property type information?"

What needs to be validated: "Will Utrecht-adjacent customers book and pay for
a cleaning service from a Groningen cleaner?"

These are different hypotheses. The first is a product optimisation experiment.
The second is the market existence question — and it requires exactly one
answered booking, not a polished form.

**S2-C does not satisfy the Foundation principle for the MVP phase.**

The principle is satisfied by shipping the booking flow, accepting payments,
and confirming the first real booking. All of those work today without S2-C.

---

## 6. Recommendation

**Defer to Sprint 3.**

**Rationale:**

The PropertyTypeSelector addresses a real operational need — but not at MVP
scale. The minimum viable mitigation (Option A: update the notes placeholder
text for cleaning bookings) costs 2 lines of i18n and zero code, and has
already been enabled by the S2-A key additions in this sprint.

Implementing S2-C now would require:
- Extending `fetchProviderForBooking` with a category join
- Updating type definitions across 2 files
- Adding a new component file
- Adding conditional logic to the Subsystem A booking flow (HIGH RISK subsystem)
- Adding `customer_notes` to the `actions.ts` insert

That is 6 file changes across Subsystem A (HIGH RISK) to solve a problem that
is currently solved by updating one i18n placeholder string.

Sprint 3 (Partner Portal) is the correct home for this feature because:
1. Sprint 3 onboards the first real cleaning partners
2. Those partners will have direct input on what property metadata is useful
3. The structured selector can be designed around confirmed partner feedback,
   not an assumed list (apartment / house / studio / office)
4. The category detection infrastructure (service_categories join in
   `fetchProviderForBooking`) will likely be needed anyway in Sprint 3
   for other reasons — adding the selector there has zero marginal cost

**Immediate action (no S2-C required):**

Add one key to both message files — already unblocked by S2-A:

```
"booking.notesPlaceholderCleaning":
  NL: "Bijv. appartement of woonhuis, bellcode, verdieping, bijzonderheden voor de schoonmaker."
  EN: "E.g. apartment or house, door code, floor, any notes for the cleaner."
```

This key is used in Sprint 3 when the booking flow's `AddressStep` gains
conditional placeholder text for cleaning bookings. Cost: 2 i18n lines.
Implementation complexity: trivial. Risk: zero.

---

## Decision gate

| Option | Code risk | Launch impact | Operational overhead | Recommended |
|---|---|---|---|---|
| Implement S2-C now | Medium (Subsystem A, 6 files) | None | None | ❌ |
| Defer to Sprint 3 + Option A placeholder | Zero (2 i18n lines) | None | ~2 min/booking | ✅ |
| Defer to Sprint 4 | Zero | None | Same as Sprint 3 | ⚠️ too late — partners onboarding in S3 |

**Recommended decision: Defer S2-C to Sprint 3. Add `booking.notesPlaceholderCleaning`
to both message files as the S2 mitigation. Close Sprint 2.**

---

*Awaiting go/no-go approval before any S2-C implementation.*
