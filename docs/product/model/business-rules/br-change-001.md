---
id: BR-CHANGE-001
type: business-rule
title: Requested changes never modify the current model before promotion
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

After the initial accepted baseline exists, every semantic evolution of the product definition
MUST be expressed as a Product Change validated as an overlay against the baseline, and baseline
artifacts are modified only by the explicit promotion of that change.

## Rationale

The current product model is the record of what the product is, as accepted today. If proposed
ideas could edit it directly, the baseline would stop distinguishing "defined and accepted" from
"under discussion", and validation, handoffs and staleness detection would all lose their anchor.
Representing evolution as Product Changes keeps proposals complete, reviewable and versioned:
each change carries full future-state artifacts, rationale and open questions, and the overlay is
validated as if it were already applied — without touching a single baseline file. Promotion then
becomes a deliberate, auditable act rather than a side effect of editing.

## Examples

- A stakeholder reports an urgent contradiction in an active business rule. Even under time
  pressure, the correction is authored as a Product Change, validated as an overlay, and promoted
  once approved and verified — urgency changes the review pace, not the mechanism.
- An SDD framework finishes an implementation increment and archives its own change records.
  That archival is an SDD-internal event; it never promotes anything into the baseline. Only an
  explicit promotion of the corresponding Product Change updates baseline artifacts.
- A reviewer inspects the overlay of a pending change to see the exact future state of every
  affected artifact, while the baseline remains byte-for-byte unchanged.

## Exceptions

The initial-baseline bootstrap is the single bounded exception: before any accepted baseline
exists, the first set of product artifacts is authored directly, because there is no baseline for
a change to be a delta against. From the moment that baseline is accepted, the rule applies.
