# structural-validation Specification

## Purpose

Deterministic graph-level validation of the product model with stable diagnostic codes and configurable strictness.

## Requirements

### Requirement: Baseline validation enforces identity and reference invariants

`product-definition validate` SHALL validate the whole baseline model: duplicate IDs
(PRODUCT005), references to unknown IDs (PRODUCT006), relationships targeting disallowed artifact
types (PRODUCT007) and active artifacts referencing retired artifacts (PRODUCT008), in addition to
the per-document checks (PRODUCT001–004, PRODUCT009).

#### Scenario: Unknown reference

- **WHEN** an active use case declares `governed-by: [BR-DOES-NOT-EXIST]`
- **THEN** validation reports PRODUCT006 naming the source artifact, the field and the missing target

#### Scenario: Disallowed target type

- **WHEN** a journey step references an actor ID instead of a use case
- **THEN** validation reports PRODUCT007 with the offending field and target

#### Scenario: Retired reference

- **WHEN** an active artifact references a retired artifact
- **THEN** validation reports PRODUCT008

### Requirement: Model-quality warnings are reported without failing the run

Validation SHALL report the warnings PRODUCT101 (file-name misalignment), PRODUCT102 (active use
case in no journey, when enabled), PRODUCT103 (requirement unreachable from any actor, when
enabled), PRODUCT104 (active references deprecated), PRODUCT105 (business rule with no consumers),
PRODUCT106 (domain term with no usage) and PRODUCT107 (bounded context owning no terms), and SHALL
exit 0 when only warnings exist unless `validation.warnings-as-errors` is set. The
`validation.warnings-as-errors` escalation SHALL apply uniformly to every validating command —
baseline `validate`, `change validate`, handoff generation, graph generation and promotion — so a
repository that opts in cannot validate strictly at the baseline while promoting or handing off a
change that carries warnings.

#### Scenario: Warnings do not fail the build

- **WHEN** validation finds only warnings
- **THEN** the exit code is 0 and each warning carries its stable code

#### Scenario: Warnings escalated by configuration

- **WHEN** `.product/config.yaml` sets `validation.warnings-as-errors: true` and a warning exists
- **THEN** the exit code is 1

#### Scenario: Escalation applies beyond baseline validate

- **WHEN** `validation.warnings-as-errors: true` is set and a Product Change overlay carries a
  warning
- **THEN** `change validate` exits 1 and promotion refuses the change

### Requirement: Diagnostics are deterministic and machine-readable

Diagnostics SHALL be ordered by file, then code, then target; `--format json` SHALL emit them as
JSON with the fields severity, code, message, file and, when available, artifact, field and
target. Identical repository content SHALL produce byte-identical diagnostic output on every
platform.

#### Scenario: JSON output

- **WHEN** `product-definition validate --format json` runs
- **THEN** the output parses as JSON and matches the documented diagnostic shape

### Requirement: Configuration is validated

The CLI SHALL load `.product/config.yaml` when present, reject unknown top-level keys and invalid
shapes with PRODUCT050 and exit code 2, and fall back to documented defaults when the file is
absent.

#### Scenario: Unknown configuration key

- **WHEN** the configuration contains an unknown top-level key
- **THEN** the CLI reports PRODUCT050 and exits with code 2
