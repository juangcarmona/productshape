---
id: CON-EXAMPLE
type: constraint
title: Example Constraint
status: draft
uses-terms: []
---

<!--
Constraint: an externally imposed or deliberately fixed boundary.
applies-to (optional): journeys, use cases or bounded contexts constrained; when absent,
the constraint applies to the entire product.
uses-terms (optional): TERM ids whose definitions understanding this constraint requires.
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
Schema reference: docs/specification/frontmatter-reference.md#constraint
-->

## Constraint

<!-- The boundary, stated precisely. -->

## Rationale

<!-- Who or what imposes it, and why. -->

## Consequences

<!-- What the constraint makes impossible, harder, or mandatory. -->
