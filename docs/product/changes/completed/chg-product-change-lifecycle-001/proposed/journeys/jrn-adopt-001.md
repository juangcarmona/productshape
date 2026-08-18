---
id: JRN-ADOPT-001
type: journey
title: Adopt Product Definition as Code in a repository
status: active
primary-actor: ACT-REPOSITORY-MAINTAINER
steps:
  - use-case: UC-INIT-001
  - use-case: UC-DEFINE-001
  - use-case: UC-CHANGE-001
  - use-case: UC-VALIDATE-001
---

## Intended Outcome

The repository holds a validated initial product baseline: a structured, machine-checkable product definition that the team accepts as the canonical account of the product, ready to evolve through explicit changes from this point on.

## Entry Conditions

- A repository exists (new or established) whose product the team wants to define as code.
- The Repository Maintainer can install tooling and commit to the repository.
- The team has product knowledge to capture — as intent, conversations, documents or an existing system.

## Journey Narrative

The Repository Maintainer initializes Product Definition as Code in the repository, choosing any AI providers and an SDD framework integration during setup. With the structure and configuration in place, the team drafts the initial product model as the complete proposed future state of `CHG-INITIAL`: actors first, then journeys, use cases, rules, terms and requirements, with open questions visible. The change validates as an overlay on the empty baseline, receives human product approval, is applied explicitly on a working branch and is offered in a pull request. A human merge accepts the initial baseline. No direct-baseline exception exists.

## Variants and Branches

- Brownfield adoption: instead of defining the model from intent, the team follows the Recover workflow, which reconstructs candidate product knowledge in the `CHG-INITIAL` overlay for human review before product approval and apply.
- Existing SDD framework: a repository already using an SDD framework configures that integration during initialization, so its documents can cite the definition from day one.

## Completion Conditions

- The product definition structure and configuration exist in the repository.
- Overlay validation and final model validation pass with no errors.
- A human has merged the applied `CHG-INITIAL` result, so the initial artifacts are accepted on the canonical branch and every later semantic modification is another Product Change.
