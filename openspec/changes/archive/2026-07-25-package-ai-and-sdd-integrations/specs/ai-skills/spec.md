# AI Skills

## ADDED Requirements

### Requirement: Canonical skills are complete and provider-independent

The repository SHALL provide the six canonical skills (define-product, recover-product, analyze-product-change, slice-product-change, prepare-sdd-handoff, audit-product-model), each defining purpose, when to use it, required inputs, files to read, deterministic commands to execute, reasoning procedure, allowed modifications, forbidden actions, human approval points, expected outputs and completion checks, with no provider-specific content.

#### Scenario: Skill completeness check

- **WHEN** the conformance suite parses each SKILL.md
- **THEN** all eleven mandatory sections are present and no vendor name appears

### Requirement: Commands are thin wrappers

The seven `/product:*` commands (define, recover, change, slice, impact, handoff, audit) SHALL reference their skill and the deterministic CLI operations without duplicating the full skill instructions.

#### Scenario: Command brevity

- **WHEN** a command file is reviewed
- **THEN** it names the skill to use, the CLI commands to run and the stop conditions, in under thirty lines of content

### Requirement: Hooks invoke deterministic commands only

The four canonical hook descriptors SHALL declare trigger, commands and blocking semantics, and SHALL only invoke deterministic CLI commands — never approving, promoting, editing product semantics or creating backlog items.

#### Scenario: Hook safety check

- **WHEN** each hook descriptor is validated
- **THEN** every command it declares is a product-definition CLI invocation and its declared effect is validation or reporting
