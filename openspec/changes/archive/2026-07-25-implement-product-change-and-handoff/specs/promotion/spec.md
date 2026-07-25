# Promotion

## ADDED Requirements

### Requirement: Promotion preconditions are enforced

`product-definition change promote <ID>` SHALL require: change status `implemented`; every
approved slice `completed` or `cancelled`; a revalidated, error-free overlay; and baseline-revision
compatibility — if any artifact named by the change's operations changed in the baseline since
`base-revision`, promotion SHALL fail with PRODUCT027 until the change is explicitly rebased.

#### Scenario: Unimplemented change refused

- **WHEN** promote runs on a change with status approved
- **THEN** the command fails naming the required status

#### Scenario: Baseline drift detected

- **WHEN** a baseline artifact listed under operations.modify changed after base-revision
- **THEN** promotion fails with PRODUCT027 naming the drifted artifact

### Requirement: Promotion applies operations explicitly and preserves history

Promotion SHALL apply additions and modifications into the model directory (files named by
lowercase ID), delete removed artifacts, move the change directory to `changes/completed/`
preserving its contents, refuse to run from any implicit trigger, and never create Git commits.
`--dry-run` SHALL report every planned action while changing nothing.

#### Scenario: Dry run changes nothing

- **WHEN** promote --dry-run executes
- **THEN** the plan lists each file to write, delete and move, and the working tree is untouched

#### Scenario: Promotion applies and archives

- **WHEN** promote executes on a compliant change
- **THEN** the baseline contains the future-state artifacts, removed files are gone, and the
  change directory now lives under changes/completed with its proposal, proposed artifacts and
  slices intact
