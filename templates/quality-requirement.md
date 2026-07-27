---
id: QR-EXAMPLE-001
type: quality-requirement
title: Example Quality Requirement
status: draft
quality-attribute: portability
applies-to:
  - UC-EXAMPLE-001
verification:
  - scenario: A measurable scenario demonstrating the quality level is met
---

<!--
Quality requirement: a measurable quality obligation. "The system should be fast" does not
satisfy this contract — Measurement must state how conformance is measured.
quality-attribute: e.g. portability, determinism, explainability, extensibility.
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
Schema reference: docs/specification/frontmatter-reference.md#quality-requirement
-->

## Requirement

<!-- The quality obligation, in explicit normative language. -->

## Measurement

<!-- How conformance is measured: the metric, the method, the threshold. -->

## Verification

<!-- How the measurement is exercised, matching the verification entries above. -->
