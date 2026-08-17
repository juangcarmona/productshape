# distribution Specification

## Purpose

Repository scaffolding, managed provider assets, the installation lock and the doctor health check.

## Requirements

### Requirement: Initialization creates the consumer structure without destroying content

`product-definition init [--ai <providers>] [--sdd <provider>] [--force]` SHALL create the docs/product tree (model subdirectories, changes/active|completed|rejected), `.product/config.yaml` reflecting the chosen integrations, authoring templates under `.product/templates/`, and a concise next-step guide — and SHALL never overwrite an existing user file without explicit `--force`.

#### Scenario: Fresh initialization

- **WHEN** init runs in an empty repository
- **THEN** the documented structure exists, the configuration validates, and next steps are printed

#### Scenario: Existing files preserved

- **WHEN** init runs where docs/product/README.md already exists
- **THEN** the file is left untouched and reported as skipped unless --force is passed

### Requirement: Initialization detects SDD frameworks and can adopt a supported one

`init` SHALL detect supported SDD frameworks present in the repository by passive inspection (OpenSpec via `openspec/`, Kiro via `.kiro/`, Spec Kit via `.specify/`) and report the detection without executing framework tooling. `--sdd openspec` SHALL wire the OpenSpec integration in the same run, creating the workspace first (`openspec init --tools none`, through the pinned `npx -y @fission-ai/openspec@1` when no CLI is installed) when none exists; frameworks that install through their own tooling SHALL receive printed setup guidance instead of an installation attempt. With an explicit selection, an explicit `--sdd none`, or no interactive terminal, init SHALL NOT prompt, and report-only mode SHALL describe the SDD actions while executing no external command and writing nothing. When the scaffold succeeds but the integration step fails, the partial outcome SHALL be reported distinctly together with the command that retries only the failed step.

{pdac:cite id="FR-INIT-002" digest="sha256:48bd2d28649dc2079f8fd5d111740f588616da5695293e6e44e47f9c24617e0d"}

{pdac:cite id="UC-INIT-001" digest="sha256:c3154d02b4d81b3bcbfccbebae64aeeb6f92922bec9ece5dc70c2cb5ea08974c"}

#### Scenario: Existing workspace wired in one run

- **WHEN** `init --sdd openspec` runs in a repository with an existing `openspec/` workspace
- **THEN** the OpenSpec integration is installed in the same run and the next steps recommend the brownfield recovery workflow

#### Scenario: Guidance instead of installation

- **WHEN** `init --sdd kiro` runs
- **THEN** setup guidance is printed, nothing is installed, and the command exits 0

#### Scenario: Non-interactive determinism

- **WHEN** init runs without an interactive terminal and without `--sdd`
- **THEN** no prompt is shown, the detection and next steps are reported, and no SDD action is taken

#### Scenario: Report-only runs nothing

- **WHEN** `init --sdd openspec --dry-run` runs in an empty repository
- **THEN** the SDD actions are described, no external command runs, and nothing is written

### Requirement: Provider assets are generated with managed headers

`integration add <provider>` and `integration update` SHALL render the canonical skills and commands into provider-specific files (Claude: `.claude/skills/<name>/SKILL.md`, `.claude/commands/product/`; Copilot: `.github/skills/<name>/SKILL.md`, `.github/prompts/`; Codex: `.agents/skills/<name>/SKILL.md`, `.agents/commands/product/`), each carrying a managed-file header with framework version and source asset, with every generated path and content hash recorded in `.product/installation.lock.json`, reproducibly. Skills SHALL be directory-based portable skills following the Agent Skills open standard, with references bundled inside the skill directory.

#### Scenario: Reproducible generation

- **WHEN** integration update runs twice without input changes
- **THEN** the generated files and the lock file are byte-identical

### Requirement: Managed-file drift is detected

`integration update --check`, `integration check` and `doctor` SHALL detect manually modified managed files (PRODUCT051) and missing managed files (PRODUCT052) by comparing lock-file hashes, without touching the files in check mode.

#### Scenario: Manual edit detected

- **WHEN** a generated provider file is edited by hand
- **THEN** the check reports PRODUCT051 naming the file and exits non-zero

### Requirement: Doctor reports repository health

`product-definition doctor` SHALL check directory structure, configuration validity, framework version metadata, managed integration files, expected generated files, provider skill layouts, installed skill references, invocation collisions, and OpenSpec integration health (when installed), reporting findings with the documented diagnostic fields. Doctor MUST report failure when an advertised integration is absent or a configured integration is non-functional.

#### Scenario: Healthy repository

- **WHEN** doctor runs on this repository after integration update
- **THEN** it exits 0 and reports each check as passing

#### Scenario: Broken OpenSpec integration detected

- **WHEN** doctor runs on a repository with an OpenSpec integration recorded but the OpenSpec CLI is missing or the config is absent
- **THEN** the openspec integration check fails and doctor exits non-zero

### Requirement: Provider installation and updates never destroy unmanaged content

`init --ai`, `integration add` and `integration update` SHALL preflight every rendered target before writing anything: a target that exists but is not recorded in `.product/installation.lock.json`, or is recorded but was modified by hand (PRODUCT051 drift), SHALL block the entire operation with every conflicting path listed, unless `--force` is passed. `init` SHALL forward its `--force` flag to provider installation. A refused operation SHALL leave both the target files and the lock file untouched.

#### Scenario: Unmanaged file blocks installation

- **WHEN** `integration add claude` runs where `.claude/skills/define-product/SKILL.md` already exists and is not recorded in the lock
- **THEN** the operation fails listing the conflicting path, no file is written, and the lock is unchanged

#### Scenario: Drifted managed file blocks update

- **WHEN** a managed provider file was edited by hand and `integration update` runs without `--force`
- **THEN** the update refuses, names the drifted file, and changes nothing

#### Scenario: Force overrides explicitly

- **WHEN** the same operations run with `--force`
- **THEN** every rendered target is written and the lock records the new hashes

### Requirement: The recommended model layout is scaffolded and committable

Initialization SHALL scaffold one directory per artifact kind under the model directory, and the three change lifecycle directories, and SHALL place a tracked placeholder file in each so the structure survives a commit — Git does not track empty directories.

The per-kind layout SHALL be a recommendation, not a requirement: artifact discovery walks the model directory recursively and keys on the frontmatter `type`, so no diagnostic SHALL be produced for an artifact in any other location under the model directory. Initialization SHALL offer `--flat` to opt out of the per-kind directories, and SHALL still create the model directory itself so validation has a directory to read.

The change lifecycle directories SHALL NOT be affected by `--flat`: they are read by change discovery and written by change archival and apply, and are not taxonomy.

The scaffolded per-kind model directories SHALL be the same set that Product Change apply uses when placing artifacts, verified by a check rather than by convention.

#### Scenario: Structure survives a fresh clone

- **WHEN** a newly initialized repository is committed and cloned
- **THEN** every scaffolded directory is present

#### Scenario: Artifacts validate outside the recommended layout

- **WHEN** an artifact is placed directly under the model directory rather than its kind directory
- **THEN** validation reports no diagnostic about its location

#### Scenario: Flat layout still validates

- **WHEN** a repository is initialized with `--flat`
- **THEN** the model directory exists with no per-kind subdirectories, and `validate` exits 0

#### Scenario: Scaffold and apply targets cannot diverge

- **WHEN** the scaffold list and the apply target map are compared
- **THEN** they contain the same directories, and a change to either alone fails the check

### Requirement: Initialization can be reported without being applied

Initialization SHALL be expressible as a plan computed without modifying the filesystem, classifying every target as one of: created (absent), preserved (present and not to be replaced), regenerated (present, owned by the installation lock, unmodified, and to be rewritten identically), overwritten (present and to be replaced because force is set), or a conflict (present, not owned by the lock or modified by hand).

The plan SHALL carry the content it would write, so that applying it writes exactly what was reported. The number of files a reported plan would create SHALL equal the number applying it creates.

A plan carrying conflicts SHALL NOT be applied. Reporting a plan SHALL exit non-zero when conflicts are present, so the report is usable as a pre-installation gate.

The provider preflight SHALL be shared between reporting and applying rather than duplicated.

#### Scenario: Reporting writes nothing

- **WHEN** initialization is reported for an empty repository
- **THEN** every path it would create is listed and no file is written

#### Scenario: Populated repository reported without loss

- **WHEN** initialization is reported for a repository that is already initialized
- **THEN** existing authored files are reported as preserved, managed files as regenerated, and nothing as overwritten

#### Scenario: Report and application agree

- **WHEN** a plan is reported and then applied to the same repository
- **THEN** the created count reported equals the created count applied

### Requirement: Health checks cover model validation and authoring templates

The health report SHALL include the outcome of baseline validation — error count, warning count and artifact count — when the caller supplies it, and SHALL NOT compute it itself, so the distribution package remains independent of the validation core. Producing the report SHALL NOT write any file.

The health report SHALL include the state of the authoring templates, distinguishing three cases: all present, none present, and some present. A repository with no installed templates SHALL be reported as healthy with an informational detail, because authoring from the specification without installed templates is legitimate. A partial set SHALL be reported as a failure.

#### Scenario: Validation outcome reported

- **WHEN** the health report is produced for a repository whose model validates cleanly
- **THEN** the model validation check passes and states the artifact count

#### Scenario: Diagnosis does not mutate

- **WHEN** the health report is produced
- **THEN** no generated output is written as a side effect

#### Scenario: Absent templates are not a failure

- **WHEN** a repository has no installed authoring templates
- **THEN** the templates check passes with an informational detail

#### Scenario: Partial templates are a failure

- **WHEN** some but not all authoring templates are present
- **THEN** the templates check fails naming the missing ones

### Requirement: The command shorthand is opt-in and configured, not implied

The canonical `/product:<name>` commands SHALL always be generated. The `/ps:<name>` shorthand aliases SHALL be generated only when the repository configuration opts in, and the setting SHALL default to off.

The setting SHALL live in the repository configuration rather than only in an initialization flag, because regenerating the integrations reads configuration and would otherwise discard a choice made at initialization time. An initialization flag MAY set it, and SHALL persist it into the generated configuration.

Where a configuration file already exists and force is not set, the existing setting SHALL take precedence over the flag, so that rendering never disagrees with the configuration on disk.

When aliases are generated, their content SHALL be identical to the canonical command they alias.

#### Scenario: Default installation has no aliases

- **WHEN** a repository is initialized without opting in
- **THEN** the canonical commands are generated and no alias is

#### Scenario: The choice survives regeneration

- **WHEN** a repository opts in and the integrations are later regenerated
- **THEN** the aliases are still generated

#### Scenario: Existing configuration wins over the flag

- **WHEN** initialization runs with the shorthand flag in a repository whose preserved configuration does not declare it, without force
- **THEN** no alias is generated, matching the configuration that remains on disk

### Requirement: Installation removes managed files it no longer generates

Installation SHALL delete a file that the installation lock records for a provider but that the provider's render no longer produces — and only when its content still matches the digest the lock records, proving the file is unmodified and owned. A file whose content has diverged SHALL be left in place and reported instead.

Removed files SHALL be reported to the caller. Without this, a file dropped from the lock would remain on disk unreferenced and unchecked forever, because drift detection reads the lock.

#### Scenario: Opting out removes the aliases it created

- **WHEN** a repository that generated aliases turns the setting off and regenerates
- **THEN** the aliases are deleted, their removal is reported, and drift detection is clean

#### Scenario: A hand-edited file is preserved

- **WHEN** a file that would be removed has been modified by hand
- **THEN** it is left in place rather than deleted
