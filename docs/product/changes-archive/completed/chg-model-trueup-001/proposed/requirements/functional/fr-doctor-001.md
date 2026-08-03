---
id: FR-DOCTOR-001
type: functional-requirement
title: Report repository health without changing anything
status: active
derived-from:
  - UC-INIT-001
  - BR-CANONICAL-001
verification:
  - scenario: Health reporting names each check, its outcome and what to run to repair a failure
  - scenario: A healthy repository reports success; a broken one names the specific failure
  - scenario: Producing the report writes no file, including no generated output
  - scenario: A legitimately absent optional component is reported as informational, not as failure
---

## Requirement

The product MUST provide a health report covering the state of an adopting repository: its
configuration, the product structure, the authoring templates, the managed integration files, the
framework version they were generated with, the configured SDD workspace, and the outcome of
validating the current model. Each check MUST be reported individually, with an outcome and, when it
fails, the command that repairs it. The report MUST exit non-zero when any check fails.

Producing the report MUST NOT modify the repository. In particular it MUST NOT write generated
outputs as a side effect of the validation it reports.

A component that is optional MUST NOT be reported as a failure merely for being absent. A repository
that authors artifacts without installed templates, or that has installed no AI integrations, is
healthy; the report MUST distinguish "absent by choice" from "present but broken", and MUST report a
partially present component as a failure because that state can only result from damage.

## Rationale

Adopters need one question answered — "is this repository set up correctly?" — without reading five
documents to learn what correct looks like. Diagnosis is also the only safe first move in a
repository someone else configured, which is why it must be read-only: a command people are told to
run when they suspect something is wrong cannot itself change anything, or it becomes the thing they
are afraid to run.

The absent-versus-broken distinction is what makes the report trustworthy rather than noisy. Every
optional component reported as a failure trains adopters to ignore failures, and the checks that
matter are then lost among the ones that do not. A partial component is the opposite case: nothing a
user does deliberately leaves half the templates installed, so that state is always worth reporting.

Health reporting is separated from asset generation because the two obligations answer different
questions and change independently. Generation is about producing correct files from canonical
sources; diagnosis is about whether a repository is in a state where the toolkit can work at all,
and it reaches across configuration, model and workspace that generation knows nothing about.

## Acceptance Scenarios

- A maintainer runs the health report on a correctly configured repository whose model validates. Every
  check reports success, the model validation line states the error, warning and artifact counts, and
  the command exits zero.
- A managed integration file has been edited by hand. The managed-files check fails, names the drift,
  and the output states the command that regenerates it.
- The health report is produced in a repository with no generated outputs directory. Afterwards the
  directory still does not exist: reporting created nothing.
- A repository has never installed the authoring templates. The templates check reports their absence
  as informational and the overall report can still succeed. In a second repository where some but not
  all templates are present, the same check fails and names the missing ones.
