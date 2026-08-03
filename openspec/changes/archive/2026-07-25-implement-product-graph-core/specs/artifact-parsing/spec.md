# Artifact Parsing (Discovery Extension)

## ADDED Requirements

### Requirement: Model discovery is complete and deterministic

The core SHALL discover every Markdown artifact under the configured model root (excluding `index.md`), in deterministic order with POSIX-normalized repository-relative paths, and load each through the established parsing and schema-validation contract.

#### Scenario: Deterministic discovery order

- **WHEN** the model is loaded twice
- **THEN** artifacts are enumerated in the same order with identical paths

#### Scenario: Navigation index exempt

- **WHEN** `docs/product/model/index.md` exists
- **THEN** it is not treated as a product artifact
