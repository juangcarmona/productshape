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

The product MUST be explainable to a newcomer in under five minutes. A single methodology overview MUST convey the artifact families, the core operations (initialize, define or recover, inspect, analyse impact, change, validate, apply, cite and verify citations) and the lifecycle from accepted baseline through Product Change, overlay validation, product approval, apply and merge acceptance, in a read of five minutes or less. It MUST also distinguish that lifecycle from implementation, verification, release and deployment. Beyond the overview, every diagnostic MUST carry its stable code, the location it applies to and the target it concerns, so a reader understands what is wrong without consulting anything else.

## Measurement

Two measurements apply. Reading time: the overview document's length must not exceed roughly 1000 words — five minutes at an ordinary reading speed of around 200 words per minute — and after reading only it, a newcomer must be able to answer four questions correctly: what artifact families exist, what operations the toolkit offers, how a Product Change reaches an accepted baseline, and what that lifecycle does not say about delivery. Diagnostic completeness: 100 percent of emitted diagnostics carry a stable code, a file location and, where applicable, the artifact and target IDs; any diagnostic missing a required field is a conformance failure.

## Verification

The overview's word count is checked automatically against the threshold whenever it changes. Onboarding checks with readers new to the methodology confirm the three questions are answerable from the overview alone; a failed answer triggers an overview revision, not a longer read. Diagnostic completeness is verified by the test suite, which asserts for every documented diagnostic code that emitted diagnostics include severity, code, message and file, plus artifact, field and target whenever the condition provides them.
