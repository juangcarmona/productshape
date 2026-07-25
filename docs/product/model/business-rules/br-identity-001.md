---
id: BR-IDENTITY-001
type: business-rule
title: Product artifact identity is defined by immutable IDs
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

Every product artifact is identified and referenced exclusively through its stable, immutable
artifact ID; file paths, file names, titles and generated locations do not define identity, and an
ID once assigned MUST never be reused for a different artifact.

## Rationale

Product knowledge outlives any particular file layout. Teams reorganise folders, rename files and
retitle artifacts as understanding improves; none of that should break traceability. Anchoring
identity in the ID lets every relationship — governed-by, defined-in, derived-from, handoff
references — survive reorganisation untouched, and lets Product Changes and Product Handoffs refer
to artifacts across time without ambiguity. Forbidding ID reuse protects history: a retired ID
still means what it always meant, so old changes, slices and handoffs remain readable years later.

## Examples

- A domain-term file is moved and renamed during a folder cleanup. Every reference to its ID keeps
  resolving; validation reports no broken relationships, because nothing about identity changed.
- A file whose name no longer matches its artifact ID is at most a warning from validation — a
  housekeeping nudge, never an identity error.
- An author retires `TERM-PRODUCT-SNAPSHOT` and later wants to introduce a new, unrelated concept
  under the same ID. Validation rejects the reuse; the new concept receives a fresh ID.
- A use case references a business rule as `governed-by: BR-CANONICAL-001`, never by the rule's
  title or file path.

## Exceptions

None.
