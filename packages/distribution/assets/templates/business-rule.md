---
id: BR-EXAMPLE-001
type: business-rule
title: Example Business Rule
status: draft
applies-to: []
---

<!--
Business rule: durable product knowledge that governs behaviour. A rule used by multiple
use cases or requirements must be independently identifiable, not hidden in stories,
acceptance criteria, UI validation, code or tests.
applies-to: journeys, use cases or bounded contexts governed by this rule.
provenance (optional): the evidence behind recovered knowledge. Set it on recovered
(brownfield) artifacts; leave it unset when authoring from intent. It records evidence,
never authorship: git history remains the record of who changed what and when.
provenance:
  source: path/to/evidence.ts      # required; may also be a URL, a ticket, or an interview
  confidence: high | medium | low  # required; how strongly the evidence supports the claim
  recovered-from: observation | inference | interview | documentation  # optional
A draft whose confidence is low is reported as PRODUCT111, so candidates needing human
validation are derivable from validation output.
Contract: docs/specification/artifacts.md
Schema reference: docs/specification/frontmatter-reference.md#business-rule
-->

## Rule

<!-- One clear normative statement. -->

## Rationale

<!-- Why this rule exists. -->

## Examples

<!-- Concrete situations showing the rule applied. -->

## Exceptions

<!-- Situations where the rule does not apply. "None." is a valid answer. -->
