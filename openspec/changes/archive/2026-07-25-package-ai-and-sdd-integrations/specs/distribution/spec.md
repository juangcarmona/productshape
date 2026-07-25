# Distribution

## ADDED Requirements

### Requirement: Initialization creates the consumer structure without destroying content

`product-definition init [--ai <providers>] [--sdd <provider>] [--force]` SHALL create the
docs/product tree (model subdirectories, changes/active|completed|rejected), `.product/config.yaml`
reflecting the chosen integrations, authoring templates under `.product/templates/`, and a concise
next-step guide — and SHALL never overwrite an existing user file without explicit `--force`.

#### Scenario: Fresh initialization

- **WHEN** init runs in an empty repository
- **THEN** the documented structure exists, the configuration validates, and next steps are printed

#### Scenario: Existing files preserved

- **WHEN** init runs where docs/product/README.md already exists
- **THEN** the file is left untouched and reported as skipped unless --force is passed

### Requirement: Provider assets are generated with managed headers

`integration add <provider>` and `integration update` SHALL render the canonical skills, commands
and hooks into provider-specific files (Claude: `.claude/skills`, `.claude/commands/product`,
`.claude/hooks`; Copilot: `.github/skills`, `.github/prompts`, `.github/hooks`), each carrying a
managed-file header with framework version and source asset, with every generated path and content
hash recorded in `.product/installation.lock.json`, reproducibly.

#### Scenario: Reproducible generation

- **WHEN** integration update runs twice without input changes
- **THEN** the generated files and the lock file are byte-identical

### Requirement: Managed-file drift is detected

`integration update --check` and `doctor` SHALL detect manually modified managed files
(PRODUCT051) and missing managed files (PRODUCT052) by comparing lock-file hashes, without
touching the files in check mode.

#### Scenario: Manual edit detected

- **WHEN** a generated provider file is edited by hand
- **THEN** the check reports PRODUCT051 naming the file and exits non-zero

### Requirement: Doctor reports repository health

`product-definition doctor` SHALL check directory structure, configuration validity, framework
version metadata, managed integration files, expected generated files, and the configured SDD
provider's workspace presence, reporting findings with the documented diagnostic fields.

#### Scenario: Healthy repository

- **WHEN** doctor runs on this repository after integration update
- **THEN** it exits 0 and reports each check as passing
