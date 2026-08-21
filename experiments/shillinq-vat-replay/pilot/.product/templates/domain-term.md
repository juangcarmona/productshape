---
id: TERM-EXAMPLE
type: domain-term
title: Example Term
status: draft
defined-in: BC-EXAMPLE
synonyms: []
---

<!--
Domain term: establishes shared meaning inside a bounded context.
defined-in is the canonical ownership direction; bounded contexts never author owns-terms.
The definition must not merely repeat the title.
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
Schema reference: docs/specification/frontmatter-reference.md#domain-term
-->

## Definition

<!-- What the term means, precisely. -->

## Distinguish From

<!-- Nearby terms this must not be confused with, and how they differ. -->

## Usage

<!-- Where and how the term is used in the product. -->
