# cli — delta

## ADDED Requirements

### Requirement: Filename misalignment is repaired mechanically and idempotently

The CLI SHALL expose `prodshape fix --filenames`, renaming every artifact file whose name is not its ID's lowercase form. The rename SHALL succeed on case-insensitive filesystems, where a casing-only rename is otherwise a silent no-op, by renaming through an intermediate name in all cases rather than branching on the filesystem's behaviour.

The intermediate name SHALL be derived from the target, so that an interruption between the two steps leaves a file whose name records its intended destination; a subsequent run SHALL complete such a rename, and SHALL refuse when the destination has since been occupied.

The command SHALL be idempotent: on an aligned model it SHALL change nothing and exit 0.

The command SHALL apply nothing when any rename is blocked — a target occupied by another artifact, two identifiers resolving to one file name, or a stale intermediate file — and SHALL report each blocked entry with its reason. Partially renaming canonical files is not permitted.

`fix` SHALL require a fixer to be named and SHALL exit 2 when none is: repair is never implicit. `--dry-run` SHALL report the plan, change nothing, and exit non-zero when anything would change, so that filename drift can be gated in continuous integration; `PRODUCT101` is a warning and is otherwise ungated.

#### Scenario: Casing-only rename on a case-insensitive filesystem

- **WHEN** an artifact file differs from its expected name only in case
- **THEN** the file is renamed and `validate` reports no `PRODUCT101`

#### Scenario: Interrupted rename completed on the next run

- **WHEN** a previous run was interrupted between the two rename steps
- **THEN** the next run completes the rename and reports having recovered it

#### Scenario: Idempotent

- **WHEN** the command runs on a model whose file names are already aligned
- **THEN** it renames nothing and exits 0

#### Scenario: Blocked entry vetoes the whole plan

- **WHEN** any rename is blocked
- **THEN** no file is renamed, the blocked entries are reported with their reasons, and the command exits 1

#### Scenario: Dry run gates drift

- **WHEN** `--dry-run` runs on a model with a misaligned file name
- **THEN** the plan is reported, nothing is changed, and the command exits non-zero

#### Scenario: No fixer named

- **WHEN** `fix` runs with no fixer flag
- **THEN** it exits 2 and names the available fixers
