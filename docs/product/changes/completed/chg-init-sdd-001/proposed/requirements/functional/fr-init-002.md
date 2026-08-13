---
id: FR-INIT-002
type: functional-requirement
title: Initialization detects SDD frameworks and can adopt a supported one
status: active
derived-from:
  - UC-INIT-001
  - BR-SDD-001
  - CON-SDD-AGNOSTIC
verification:
  - id: S1
    scenario: Initialization detects and reports any supported SDD framework already present in the target repository
  - id: S2
    scenario: In a repository where a detected framework has a first-party integration, initialization installs that integration in the same run and its next steps recommend the brownfield recovery workflow
  - id: S3
    scenario: In a repository with no SDD framework, initialization offers the supported frameworks; the one with a first-party integration is set up end to end, and every other supported framework receives printed setup guidance instead of an installation attempt
  - id: S4
    scenario: Under an explicit framework selection, an explicit opt out, or a non-interactive environment, initialization never prompts and behaves deterministically
  - id: S5
    scenario: Report-only initialization describes the SDD actions a real run would take, executes no external command and writes nothing
---

## Requirement

Initialization MUST detect supported SDD frameworks already present in the target repository and MUST report what it detected. Detection MUST be a passive inspection of the repository: it MUST NOT execute framework tooling and MUST NOT modify anything.

When a detected framework has a first-party integration, initialization MUST be able to install that integration in the same run, and when it does, the printed next steps MUST recommend the brownfield recovery workflow so the existing system's product knowledge can enter the model through `CHG-INITIAL`. When no SDD framework is present, initialization MUST offer the supported frameworks: a framework with a first-party integration MUST be installable end to end from the same command, and every other supported framework MUST receive printed setup guidance instead of an installation attempt, because it installs through its own tooling.

Interaction MUST be optional. An explicit framework selection, an explicit opt out, and a non-interactive environment MUST each produce deterministic behaviour without prompting; in a non-interactive environment with no explicit selection, initialization MUST report detection and next steps and take no SDD action. Report-only initialization MUST describe the SDD actions a real run would take, MUST NOT execute any external command and MUST NOT write anything.

When the structural part of initialization succeeds but the SDD integration step fails, the command MUST report the partial outcome distinctly, naming what succeeded, what failed and the command that retries only the failed step. A failed integration step MUST NOT be reported as success.

## Rationale

Adoption begins with initialization, and the seam between "the structure exists" and "the framework the team already uses is wired" is where adopters stall: the integration exists as a separate command that nothing points to. Detection closes that seam with a passive, safe inspection, and same-run installation removes the manual recipe for the one framework the product integrates with first party. Guidance instead of installation for the other frameworks is the honest shape of support: driving a third-party installer the product does not own would trade one manual step for an opaque failure mode.

Determinism without a terminal is an obligation, not a convenience: initialization runs in scripts and CI, and a command that prompts in one environment and not another produces outcomes that cannot be trusted. The report-only clause extends the trust argument of `FR-INIT-001` to actions that reach outside the repository: a maintainer deciding whether to run initialization needs to know what external commands it would run, and the only trustworthy answer is a report that runs none of them.

The partial-failure clause exists because same-run adoption couples two steps with different failure modes. A scaffold that succeeded is not undone by an integration that failed, and pretending the run failed entirely, or worse succeeded entirely, would leave the maintainer unable to recover with one command.
