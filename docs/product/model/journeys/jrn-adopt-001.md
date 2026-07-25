---
id: JRN-ADOPT-001
type: journey
title: Adopt Product Definition as Code in a repository
status: active
primary-actor: ACT-REPOSITORY-MAINTAINER
steps:
  - use-case: UC-INIT-001
  - use-case: UC-DEFINE-001
  - use-case: UC-VALIDATE-001
---

## Intended Outcome

The repository holds a validated initial product baseline: a structured, machine-checkable
product definition that the team accepts as the canonical account of the product, ready to evolve
through explicit changes from this point on.

## Entry Conditions

- A repository exists (new or established) whose product the team wants to define as code.
- The Repository Maintainer can install tooling and commit to the repository.
- The team has product knowledge to capture — as intent, conversations, documents or an existing
  system.

## Journey Narrative

The Repository Maintainer initializes Product Definition as Code in the repository, choosing any
AI providers and an SDD framework integration during setup. With the structure and configuration
in place, the team establishes the initial product model: actors first, then journeys, use cases,
rules, terms and requirements, keeping open questions visible. This is the one moment in the
product's life when authoring directly into the baseline is allowed — the initial-baseline
bootstrap exception; every semantic evolution afterwards goes through a Product Change. The team
runs validation repeatedly as the model grows, resolving each diagnostic, until the definition is
structurally coherent and a human review marks the artifacts active.

## Variants and Branches

- Brownfield adoption: instead of defining the model from intent, the team follows the Recover
  workflow, which reconstructs candidate product knowledge from the existing system for a human
  to validate before it enters the baseline.
- Existing SDD framework: a repository already using an SDD framework configures that
  integration during initialization, so later handoffs land in the workflow the team already
  runs.

## Completion Conditions

- The product definition structure and configuration exist in the repository.
- Validation passes with no errors on the initial model.
- The initial artifacts are active and the team treats the baseline as canonical: subsequent
  modifications are expressed as Product Changes.
