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
  - scenario: Init extends the repository ignore rules only when the user explicitly asks
  - scenario: Extending the ignore rules preserves existing content and adds nothing on a second run
---

## Requirement

The product MUST provide an initialization command that creates the product definition structure, a valid repository configuration and the artifact templates in the target repository. The command MUST NOT overwrite any pre-existing file that contains user content unless the user gives explicit confirmation or passes `--force`. Re-running initialization in an already initialized repository MUST add only what is missing and leave existing user content untouched. On success the command MUST print a summary of what was created together with the recommended next steps, and those next steps MUST state which parts of the installation belong in version control.

The product MUST be able to report what initialization would do to every path — create, preserve, extend, regenerate, overwrite, or refuse as a conflict — without writing anything. The report MUST agree with what applying it produces; a report that could differ from the outcome is worse than none, because it is trusted. Initialization MUST NOT modify any file the user owns outside the paths it creates.

Initialization MAY add the rules that exclude regenerable output to the repository's ignore file, and MUST NOT do so unless the user explicitly requests it through a command option or an interactive confirmation. An environment that cannot be asked MUST NOT be treated as having consented. Where the request is given, the change MUST be additive: existing content MUST be preserved exactly, only rules the repository does not already cover MUST be added, the rules MUST follow the configured location of generated output, and a subsequent run MUST add nothing further.

## Rationale

Adoption begins with initialization, and adopters run it inside repositories that already contain code, documentation and history they care about. If the first command a team runs can silently destroy their files, the methodology loses trust before a single artifact is authored. Because the authored files are canonical, protecting them at initialization time is not a convenience but a direct obligation of the canonical-source rule. A printed next-step guide turns a bare directory tree into a starting point: the maintainer knows immediately how to create `CHG-INITIAL`, validate its overlay and carry the approved result through apply and merge acceptance.

Reporting without acting is the other half of that trust, and it is a distinct obligation rather than a convenience: the question "what will this do to my repository?" is the one an adopter must answer before running anything, and answering it by running the command and inspecting the damage is not an answer. Requiring the report to agree with the outcome is what makes it worth having — an approximate preview would be consulted once, found wrong, and never trusted again.

The ignore rules are the one place where the safe default leaves the repository in the wrong state. Initialization creates output that is regenerable and never canonical, and a repository that tracks it accumulates noise no reader is meant to read; the adopter who notices reaches instead for excluding the whole installation directory, which removes the configuration and the installation lock that every other clone verifies against. Because the correct rules are derivable from configuration, leaving them to be transcribed by hand converts a known answer into an avoidable mistake. Consent is what separates this from the content-destroying edits the rest of this requirement forbids: an addition that preserves every existing byte and only ever runs when asked cannot lose work, while a silent edit to a file the user owns would be discovered in a diff rather than decided. Stating what to commit alongside what to ignore closes the same question from the other side, because an exclusion rule tells an adopter nothing about what the installation needs kept.

## Acceptance Scenarios

- In a repository with no product structure, `prodshape init` creates the product tree, writes a valid configuration and renders the artifact templates; afterwards the repository validates cleanly with an empty model.
- Initialization is run where a file it would create already exists with user content. The command stops and asks for explicit confirmation; without confirmation or `--force`, the file is left byte-identical and the command reports which files were skipped.
- Initialization completes and the output names every created file and directory, followed by the recommended next steps: author `CHG-INITIAL` under `changes/active/`, place the proposed artifacts under `proposed/`, validate the overlay, obtain product approval, apply explicitly, open a pull request whose merge accepts the initial baseline, and commit the configuration, the installation lock, the templates and the integration records.
- A maintainer asks what initialization would do in a repository that already contains documentation. Every path is reported by outcome, no file is written, and the repository is byte-identical afterwards.
- The same repository is then initialized for real. The number of files the report said would be created equals the number created.
- Initialization runs without an ignore-rule request in a repository that has an ignore file. The file is byte-identical afterwards and the output states which rules to add. It is then run with the request, and the rules are present.
- Initialization adds the rules to an ignore file that already contains entries. Every pre-existing line is unchanged, a rule the file already expressed in a different form is not repeated, and running it a second time leaves the file byte-identical.
