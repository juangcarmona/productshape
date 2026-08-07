---
id: FR-EXAMPLE-001
type: functional-requirement
title: Example Functional Requirement
status: draft
derived-from:
  - UC-EXAMPLE-001
verification:
  - scenario: An observable scenario demonstrating the obligation is met
---

<!--
Functional requirement: a derived product obligation stating what the product must do.
derived-from: the use cases, business rules or constraints it originates from (traceability).
A requirement is not a disguised implementation task.
provenance (optional): the evidence behind recovered knowledge. Set it on recovered
(brownfield) artifacts; leave it unset when authoring from intent. It records evidence,
never authorship: git history remains the record of who changed what and when.
provenance:
  source: path/to/evidence.ts      # required; may also be a URL, a ticket, or an interview
  confidence: high | medium | low  # required; how strongly the evidence supports the claim
  recovered-from: observation | inference | interview | documentation  # optional
A draft whose confidence is low is reported as PRODUCT111, so candidates needing human
validation are derivable from validation output.
Contract: https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md
Schema reference: docs/specification/frontmatter-reference.md#functional-requirement
-->

## Requirement

<!-- The obligation, in explicit normative language ("The product MUST ..."). -->

## Rationale

<!-- Why this obligation exists, in product terms. -->
