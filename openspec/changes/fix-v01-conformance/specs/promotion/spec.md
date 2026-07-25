# promotion — delta

## MODIFIED Requirements

### Requirement: Promotion preconditions are enforced

`product-definition change promote <ID>` SHALL require: change status `implemented`; every
approved slice `completed` or `cancelled`; a revalidated, error-free overlay; baseline-revision
compatibility — if any artifact named by the change's operations changed in the baseline since
`base-revision`, promotion SHALL fail with PRODUCT027 until the change is explicitly rebased —
and coverage evidence for every completed slice. When an SDD provider is configured, evidence
SHALL be discovered deterministically from the SDD workspace (for OpenSpec: handoff sidecars
whose `source` matches the change and slice, in lexicographic directory order, including the
archive) and verified with the coverage check; a completed slice with no discoverable or no
error-free evidence SHALL fail promotion with PRODUCT044, and the union of covered requirements
SHALL contain every requirement implemented by completed slices. Cancelled slices are exempt.
When no SDD provider is configured and the change has at least one completed slice, promotion
SHALL refuse with PRODUCT044 unless `--accept-external-evidence` is passed, which SHALL downgrade
the refusal to a warning recorded in the plan output; the flag SHALL have no effect when an SDD
provider is configured.

#### Scenario: Unimplemented change refused

- **WHEN** promote runs on a change with status approved
- **THEN** the command fails naming the required status

#### Scenario: Baseline drift detected

- **WHEN** a baseline artifact listed under operations.modify changed after base-revision
- **THEN** promotion fails with PRODUCT027 naming the drifted artifact

#### Scenario: Missing coverage evidence refused

- **WHEN** an SDD provider is configured and a completed slice has no handoff whose coverage
  check passes without errors
- **THEN** promotion fails with PRODUCT044 naming the slice, and the baseline is untouched

#### Scenario: No SDD provider configured

- **WHEN** no SDD provider is configured and the change has a completed slice
- **THEN** promotion refuses with PRODUCT044 naming both remedies (configure a provider or pass
  `--accept-external-evidence`)

#### Scenario: External evidence accepted explicitly

- **WHEN** no SDD provider is configured and promote runs with `--accept-external-evidence`
- **THEN** promotion proceeds and the plan output records a PRODUCT044 warning stating that
  evidence was asserted outside any adapter

#### Scenario: The escape flag cannot bypass real evidence

- **WHEN** an SDD provider is configured, coverage evidence fails, and
  `--accept-external-evidence` is passed
- **THEN** promotion still fails

### Requirement: Promotion applies operations explicitly and preserves history

Promotion SHALL apply additions and modifications into the model directory (files named by
lowercase ID), delete removed artifacts, move the change directory to `changes/completed/`
preserving its contents, refuse to run from any implicit trigger, and never create Git commits.
`--dry-run` SHALL report every planned action while changing nothing. Before mutating anything,
promotion SHALL preflight every planned action — read each write source, confirm each delete
target exists, and confirm the archive destination does not exist — and a preflight failure
SHALL leave the working tree untouched. Execution SHALL order the change-directory move last, so
the archived change directory only appears when every other action succeeded, and an execution
failure SHALL report recovery guidance based on version control.

#### Scenario: Dry run changes nothing

- **WHEN** promote --dry-run executes
- **THEN** the plan lists each file to write, delete and move, and the working tree is untouched

#### Scenario: Promotion applies and archives

- **WHEN** promote executes on a compliant change
- **THEN** the baseline contains the future-state artifacts, removed files are gone, and the
  change directory now lives under changes/completed with its proposal, proposed artifacts and
  slices intact

#### Scenario: Preflight failure mutates nothing

- **WHEN** the archive destination for the change directory already exists
- **THEN** promote fails before writing, deleting or moving any file, and the working tree is
  byte-identical to before the attempt
