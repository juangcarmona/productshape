# cli Specification

## Purpose

TBD - created by archiving change implement-product-graph-core. Update Purpose after archive.

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
