# Copy / i18n / Legal / SEO Task Template

> Use this template for any task touching: customer-facing text, message keys, legal pages, SEO copy, or cookie/privacy wording.

---

## Step 0 — Required Reading

```
Read docs/PROJECT_MAP.md — subsystem C (and F if SEO pages are involved)
```

No other docs required for pure copy tasks.

---

## Scope Declaration

```
SUBSYSTEM: C — i18n / Copy / Legal  (or F — Marketing Pages)
TASK: [one sentence — name the specific keys or pages]
FILES IN SCOPE: [list only — be specific about which keys]
```

---

## Allowed Files (read + edit)

```
messages/nl.json                              ← Dutch strings (primary)
messages/en.json                              ← English strings (secondary)
app/[locale]/privacybeleid/page.tsx           ← only if privacy copy task
app/[locale]/algemene-voorwaarden/page.tsx    ← only if terms copy task
app/[locale]/faq/page.tsx                     ← only if FAQ copy task
components/layout/cookie-banner.tsx           ← only if cookie copy task
app/[locale]/massage-aan-huis-utrecht/page.tsx
app/[locale]/sportmassage-utrecht/page.tsx
app/[locale]/deep-tissue-massage-utrecht/page.tsx
app/[locale]/hotel-massage-utrecht/page.tsx
app/[locale]/over-ons/page.tsx
app/[locale]/hoe-het-werkt/page.tsx
app/[locale]/voor-masseurs/page.tsx
```

---

## Forbidden Files (do not read or touch)

```
app/[locale]/aanbod/[slug]/boeken/actions.ts    ← booking logic
app/api/stripe/webhook/route.ts                 ← payment logic
app/api/availability/route.ts                   ← availability logic
supabase/migrations/*                           ← security task only
proxy.ts                                        ← security task only
lib/supabase/*                                  ← security task only
node_modules/
```

---

## Brand Voice Rules (Alvessa)

Every piece of copy must pass this filter:

**Tone:** calm · premium · trustworthy · not over-marketing

**Forbidden language:**
- Medical effect claims: "heals", "cures", "treats", "elimineert pijn", "geneest", "vermindert chronische pijn"
- Absolute trust claims: "always", "guaranteed", "world's best/safest/most trusted", "altijd", "gegarandeerd"
- Absolute coverage claims: "all hotels", "alle hotels", "alle steden"
- "Instantly" / "direct" for financial payouts (use "automatic" / "automatisch")
- Injury/recovery medical promises: "prevents injuries", "heals injuries", "voorkomt blessures"

**Preferred alternatives:**
- Medical → wellness: "can help relax", "may support recovery", "kan bijdragen aan ontspanning"
- Absolute → qualified: "many hotels", "veel hotels"; "as soon as possible", "zo snel mogelijk"
- Injury → qualified: "can help reduce muscle soreness", "kan bijdragen aan spierherstel"
- Cancellation (no self-service UI): direct to hallo@alvessa.nl — do not imply self-service

---

## Cancellation Copy Rule

There is currently no self-service cancellation UI. Any copy about cancellation must:
- Direct users to: `hallo@alvessa.nl`
- Not imply automatic or self-service cancellation
- Example (NL): "Neem contact op via hallo@alvessa.nl om te annuleren."
- Example (EN): "Please contact us at hello@alvessa.nl to cancel."

---

## GDPR / Privacy Wording Rule

When mentioning data processors or cross-border transfers:
- Name processors with their specific role in parentheses: `Supabase (databasehosting)`, `Stripe (betalingsverwerking, PCI-DSS gecertificeerd)`
- For cross-border data: "Waar gegevens buiten de EER worden verwerkt, doen wij dit met passende waarborgen."
- EN equivalent: "Where data is processed outside the EEA, we do so with appropriate safeguards."
- Do not claim data never leaves the EU unless verified.

---

## Dutch Language Rules

| Wrong | Correct |
|-------|---------|
| massage therapeut (with space) | massagetherapeut |
| sessionprijs | sessieprijs |
| diepgeweven | deep tissue (use English loan word) |

---

## Bilingual Consistency Rule

Every key changed in `nl.json` must have a corresponding update in `en.json` (and vice versa) — even if the English version already uses softened language. Both files must remain in sync.

---

## Minimum Diff Rule

- Change only the keys named in the task.
- Do not restructure the JSON.
- Do not rewrite surrounding copy "while you're in there."
- Do not change tone/style beyond what is requested.

---

## Required Output

```
## Copy Task Complete

FILES CHANGED:
- messages/nl.json — keys changed: [list]
- messages/en.json — keys changed: [list]

BEFORE / AFTER:
[key]: "[old value]" → "[new value]"

BRAND VOICE CHECK:
- [ ] No medical effect claims
- [ ] No absolute trust claims
- [ ] No absolute coverage claims ("all hotels" etc.)
- [ ] Cancellation directs to hallo@alvessa.nl
- [ ] GDPR wording accurate
- [ ] Dutch spelling correct

BILINGUAL SYNC: [✅ both files updated / ❌ mismatch — explain]

BUILD STATUS: [✅ not required for pure copy / run if page.tsx was edited]

NEXT: [one sentence]
```
