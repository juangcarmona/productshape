---
id: FR-ENGINEERING-PORTAL-001
type: functional-requirement
title: Present ProductShape engineering outputs distinctly
status: active
derived-from:
  - UC-ENGINEERING-PORTAL-001
verification:
  - scenario: The portal identifies Product, Architecture and E2E outputs separately and links each available output to its source.
  - scenario: The portal identifies the source revision or originating run for each available output when that information exists.
  - scenario: When an E2E report has not been produced, the portal does not imply that a run or successful outcome exists.
---

## Requirement

The engineering portal MUST present the Product Snapshot, Architecture Snapshot and E2E journey reports as distinct output types. It MUST list only outputs that have been produced and made available, identify the source revision or originating run when known, and link to the relevant canonical source. It MUST NOT present a generated output as an editable or canonical source.

## Rationale

Readers need to understand what each output describes and which source state it represents. Clear separation and source identity prevent a product model, architecture view and test report from being mistaken for one another.
