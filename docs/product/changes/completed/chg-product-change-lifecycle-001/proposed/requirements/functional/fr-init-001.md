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
  - scenario: Init can report what it would do to every path without writing anything
  - scenario: What a report says would be created matches what applying it creates
---

## Requirement

The product MUST provide an initialization command that creates the product definition structure, a valid repository configuration and the artifact templates in the target repository. The command MUST NOT overwrite any pre-existing file that contains user content unless the user gives explicit confirmation or passes `--force`. Re-running initialization in an already initialized repository MUST add only what is missing and leave existing user content untouched. On success the command MUST print a summary of what was created together with the recommended next steps.

The product MUST be able to report what initialization would do to every path — create, preserve, regenerate, overwrite, or refuse as a conflict — without writing anything. The report MUST agree with what applying it produces; a report that could differ from the outcome is worse than none, because it is trusted. Initialization MUST NOT modify any file the user owns outside the paths it creates, and in particular MUST NOT edit the repository's ignore rules on the user's behalf.

## Rationale

Adoption begins with initialization, and adopters run it inside repositories that already contain code, documentation and history they care about. If the first command a team runs can silently destroy their files, the methodology loses trust before a single artifact is authored. Because the authored files are canonical, protecting them at initialization time is not a convenience but a direct obligation of the canonical-source rule. A printed next-step guide turns a bare directory tree into a starting point: the maintainer knows immediately how to create `CHG-INITIAL`, validate its overlay and carry the approved result through apply and merge acceptance.

Reporting without acting is the other half of that trust, and it is a distinct obligation rather than a convenience: the question "what will this do to my repository?" is the one an adopter must answer before running anything, and answering it by running the command and inspecting the damage is not an answer. Requiring the report to agree with the outcome is what makes it worth having — an approximate preview would be consulted once, found wrong, and never trusted again.

## Acceptance Scenarios

- In a repository with no product structure, `prodshape init` creates the product tree, writes a valid configuration and renders the artifact templates; afterwards the repository validates cleanly with an empty model.
- Initialization is run where a file it would create already exists with user content. The command stops and asks for explicit confirmation; without confirmation or `--force`, the file is left byte-identical and the command reports which files were skipped.
- Initialization completes and the output names every created file and directory, followed by the recommended next steps: author `CHG-INITIAL` under `changes/active/`, place the proposed artifacts under `proposed/`, validate the overlay, obtain product approval, apply explicitly and open a pull request whose merge accepts the initial baseline.
- A maintainer asks what initialization would do in a repository that already contains documentation. Every path is reported by outcome, no file is written, and the repository is byte-identical afterwards.
- The same repository is then initialized for real. The number of files the report said would be created equals the number created.
