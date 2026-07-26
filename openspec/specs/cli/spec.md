# cli Specification

## Purpose

The prodshape command-line surface: commands, options, exit codes and output contracts.

## Requirements

### Requirement: The product-definition binary exposes the core workflows

The `product-definition` binary SHALL provide `validate`, `graph`, `inspect <ID>` and
`impact <ID>` with the documented options, resolving the repository root and configuration from
the working directory.

#### Scenario: Running from a subdirectory

- **WHEN** a command runs from a subdirectory of the repository
- **THEN** the product root is resolved via `.product/config.yaml` discovery upward

### Requirement: Exit codes are documented and stable

The CLI SHALL exit 0 on success (warnings allowed), 1 on validation or conformance errors, 2 on
invalid invocation or configuration, and 3 on unexpected internal failure.

#### Scenario: Invalid invocation

- **WHEN** an unknown command or flag is passed
- **THEN** the exit code is 2

#### Scenario: Validation errors

- **WHEN** the model contains a PRODUCT006 error
- **THEN** `validate` exits 1

### Requirement: The CLI contains no domain rules

All validation, graph and impact logic SHALL live in the core library; the CLI SHALL only parse
arguments, orchestrate core operations and format output.

#### Scenario: Core reuse

- **WHEN** the core library is used directly (without the CLI)
- **THEN** identical diagnostics and graph results are produced for identical input

### Requirement: The allowed frontmatter for a kind is available from the command line

The CLI SHALL expose `prodshape schema [kind]`, printing the allowed frontmatter for one document
kind, or listing every kind with its ID prefix when the argument is omitted. Output SHALL be derived
from the bundled schemas so it cannot disagree with validation, and SHALL be available as text and
as `--format json` under a stable schema identifier.

The command SHALL NOT require a product repository: it is a reference lookup over bundled data, and
it is needed before initialization. `kind` SHALL accept the frontmatter `type` value and the
artifact ID prefix, case-insensitively; no other alias SHALL be accepted, because the specification
does not define one. An unknown kind SHALL exit 2 as an invalid invocation, listing the known kinds.

#### Scenario: Reference lookup outside a repository

- **WHEN** `prodshape schema actor` runs in a directory with no product definition
- **THEN** it prints the actor frontmatter contract and exits 0

#### Scenario: ID prefix accepted as an alias

- **WHEN** `prodshape schema UC` runs
- **THEN** it prints the use-case contract, identically to `prodshape schema use-case`

#### Scenario: Unknown kind rejected as an invalid invocation

- **WHEN** `prodshape schema usecase` runs
- **THEN** the command exits 2 and reports the known kinds

### Requirement: Filename misalignment is repaired mechanically and idempotently

The CLI SHALL expose `prodshape fix --filenames`, renaming every artifact file whose name is not its
ID's lowercase form. The rename SHALL succeed on case-insensitive filesystems, where a casing-only
rename is otherwise a silent no-op, by renaming through an intermediate name in all cases rather than
branching on the filesystem's behaviour.

The intermediate name SHALL be derived from the target, so that an interruption between the two steps
leaves a file whose name records its intended destination; a subsequent run SHALL complete such a
rename, and SHALL refuse when the destination has since been occupied.

The command SHALL be idempotent: on an aligned model it SHALL change nothing and exit 0.

The command SHALL apply nothing when any rename is blocked — a target occupied by another artifact,
two identifiers resolving to one file name, or a stale intermediate file — and SHALL report each
blocked entry with its reason. Partially renaming canonical files is not permitted.

`fix` SHALL require a fixer to be named and SHALL exit 2 when none is: repair is never implicit.
`--dry-run` SHALL report the plan, change nothing, and exit non-zero when anything would change, so
that filename drift can be gated in continuous integration; `PRODUCT101` is a warning and is
otherwise ungated.

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
- **THEN** no file is renamed, the blocked entries are reported with their reasons, and the command
  exits 1

#### Scenario: Dry run gates drift

- **WHEN** `--dry-run` runs on a model with a misaligned file name
- **THEN** the plan is reported, nothing is changed, and the command exits non-zero

#### Scenario: No fixer named

- **WHEN** `fix` runs with no fixer flag
- **THEN** it exits 2 and names the available fixers
