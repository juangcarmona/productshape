---
id: BR-RELATIONSHIPS-001
type: business-rule
title: Reverse relationships are derived, never manually maintained
status: active
applies-to:
  - BC-PRODUCT-DEFINITION
---

## Rule

Every relationship between product artifacts has exactly one canonical authored direction — one source artifact type, one frontmatter field, one allowed target set — and all reverse views are derived by tooling; users MUST NOT author or maintain reciprocal references.

## Rationale

Bidirectional references maintained by hand always drift: one side gets updated, the other does not, and the model quietly contradicts itself. Choosing a single canonical direction per relationship makes every edit atomic — declaring or removing a relationship touches exactly one file — and makes the derived reverse view trustworthy by construction, because it is recomputed from the canonical files every time the product graph is compiled. It also keeps authoring cheap: adding a domain term to a context requires no edit to the context at all.

## Examples

- A domain term declares `defined-in: BC-PRODUCT-DEFINITION`. The bounded context's owned terms are computed from every term that points at it; the context file itself lists nothing.
- An author adds an `owns-terms` field to a bounded context's frontmatter. Validation rejects it as an unknown property — ownership is derived from each term's `defined-in`, never authored.
- A use case declares `governed-by` on a business rule. The rule's "governed use cases" view appears in inspection output and generated indexes as a derived field, not in the rule's file.
- Deleting a term's `defined-in` reference updates the context's derived owned-terms view on the next graph compilation with no second edit anywhere.

## Exceptions

None.
