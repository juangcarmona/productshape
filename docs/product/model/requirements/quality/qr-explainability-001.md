---
id: QR-EXPLAINABILITY-001
type: quality-requirement
title: Remain explainable in under five minutes
status: active
quality-attribute: explainability
applies-to:
  - JRN-ADOPT-001
  - BC-PRODUCT-DEFINITION
verification:
  - scenario: The overview alone conveys the artifact families, core operations and change flow
  - scenario: The overview is readable in under five minutes at ordinary reading speed
  - scenario: Every diagnostic explains itself with code, location and target, no lookup needed
---

## Requirement

The product MUST be explainable to a newcomer in under five minutes. A single methodology overview MUST convey the artifact families, the core operations (initialize, validate, inspect, analyze impact, change, hand off, promote) and the change flow from proposal through delivery to promotion, in a read of five minutes or less. Beyond the overview, the product MUST explain itself at the moment of use: every diagnostic MUST carry its stable code, the location it applies to and the target it concerns, so a reader understands what is wrong without consulting anything else.

## Measurement

Two measurements apply. Reading time: the overview document's length must not exceed roughly 1000 words — five minutes at an ordinary reading speed of around 200 words per minute — and after reading only it, a newcomer must be able to answer three questions correctly: what artifact families exist, what operations the toolkit offers, and how a change travels from proposal to promoted baseline. Diagnostic completeness: 100 percent of emitted diagnostics carry a stable code, a file location and, where applicable, the artifact and target IDs; any diagnostic missing a required field is a conformance failure.

## Verification

The overview's word count is checked automatically against the threshold whenever it changes. Onboarding checks with readers new to the methodology confirm the three questions are answerable from the overview alone; a failed answer triggers an overview revision, not a longer read. Diagnostic completeness is verified by the test suite, which asserts for every documented diagnostic code that emitted diagnostics include severity, code, message and file, plus artifact, field and target whenever the condition provides them.
