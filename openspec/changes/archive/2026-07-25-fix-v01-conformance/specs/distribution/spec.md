# distribution — delta

## ADDED Requirements

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
