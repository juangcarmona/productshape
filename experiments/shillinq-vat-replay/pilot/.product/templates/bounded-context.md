---
id: BC-EXAMPLE
type: bounded-context
title: Example Context
status: draft
---

<!--
Bounded context: a product-language boundary. It delimits where a set of domain terms
carries a specific meaning. It does not imply implementation modules or DDD aggregates.
Owned terms are derived from each Domain Term's defined-in field; do not list them here.
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
Schema reference: docs/specification/frontmatter-reference.md#bounded-context
-->

## Responsibility

<!-- The product responsibility this context covers. -->

## Language

<!-- The character of the language spoken here; individual terms live in domain/terms. -->

## Boundaries

<!-- What is explicitly outside this context. -->

## External Relationships

<!-- Neighbouring contexts and external systems, and how meaning translates at the edges. -->
