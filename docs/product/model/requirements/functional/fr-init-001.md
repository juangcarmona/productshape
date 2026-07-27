---
id: FR-INIT-001
type: functional-requirement
title: Initialize a repository without destroying user content
status: active
derived-from:
  - UC-INIT-001
  - BR-CANONICAL-001
verification:
  - scenario: Init in a fresh repository creates the product structure, configuration and templates
  - scenario: Init refuses to overwrite an existing user file without confirmation or --force
  - scenario: Init finishes by printing what was created and the recommended next steps
---

## Requirement

The product MUST provide an initialization command that creates the product definition structure,
a valid repository configuration and the artifact templates in the target repository. The command
MUST NOT overwrite any pre-existing file that contains user content unless the user gives explicit
confirmation or passes `--force`. Re-running initialization in an already initialized repository
MUST add only what is missing and leave existing user content untouched. On success the command
MUST print a summary of what was created together with the recommended next steps.

## Rationale

Adoption begins with initialization, and adopters run it inside repositories that already contain
code, documentation and history they care about. If the first command a team runs can silently
destroy their files, the methodology loses trust before a single artifact is authored. Because the
authored files are canonical, protecting them at initialization time is not a convenience but a
direct obligation of the canonical-source rule. A printed next-step guide turns a bare directory
tree into a starting point: the maintainer knows immediately what to author and how to validate it.

## Acceptance Scenarios

- In a repository with no product structure, `prodshape init` creates the product tree,
  writes a valid configuration and renders the artifact templates; afterwards the repository
  validates cleanly with an empty model.
- Initialization is run where a file it would create already exists with user content. The command
  stops and asks for explicit confirmation; without confirmation or `--force`, the file is left
  byte-identical and the command reports which files were skipped.
- Initialization completes and the output names every created file and directory, followed by the
  recommended next steps: define the initial product model, then run validation.
