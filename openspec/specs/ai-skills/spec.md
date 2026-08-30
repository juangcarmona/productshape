# ai-skills Specification

<!-- pdac-scope: cited -->

## Purpose

The canonical AI skills, slash commands and hook descriptors rendered into provider-specific integrations.

## Requirements

### Requirement: Canonical skills are complete and provider-independent

The repository SHALL provide the seven canonical skills (define-product, recover-product, explore-product, analyze-product-change, audit-product-model, bind-consumers, refine-product), each defining purpose, when to use it, required inputs, files to read, deterministic commands to execute, reasoning procedure, allowed modifications, forbidden actions, human approval points, expected outputs and completion checks, with no provider-specific content.

{pdac:cite id="FR-DISTRIBUTION-001" digest="sha256:2388424fc21af195bb6e33c569651407ca86fe5701ff663426325037f54caa5e"}

{pdac:cite id="ACT-AI-ASSISTANT" digest="sha256:4a415e39588a8fbec8fc077090e538a5e75406b0f65a3e91cff5b86670dc7e16"}

#### Scenario: Skill completeness check

- **WHEN** the conformance suite parses each SKILL.md
- **THEN** all eleven mandatory sections are present and no vendor name appears

### Requirement: Commands are thin wrappers

The eight `/product:*` commands (define, recover, explore, change, impact, audit, bind, refine) SHALL reference their skill and the deterministic CLI operations without duplicating the full skill instructions.

#### Scenario: Command brevity

- **WHEN** a command file is reviewed
- **THEN** it names the skill to use, the CLI commands to run and the stop conditions, in under thirty lines of content

### Requirement: Skills are self-contained and portable

Every skill SHALL use only portable Agent Skills frontmatter fields (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`), SHALL NOT reference repository-only files that do not exist after `npm pack` and clean installation, and SHALL bundle all detailed reference material in `references/` inside the skill directory. Skills SHALL NOT depend on mutable remote `main` content or ProductShape dogfooding artifacts.

{pdac:cite id="FR-DISTRIBUTION-001" digest="sha256:2388424fc21af195bb6e33c569651407ca86fe5701ff663426325037f54caa5e"}

#### Scenario: Self-contained after installation

- **WHEN** a skill is installed into a clean consumer repository
- **THEN** every local link and referenced resource resolves relative to the skill directory

### Requirement: Recovery records provenance in frontmatter

The `recover-product` skill SHALL instruct that every candidate carries `provenance` frontmatter with its source and confidence, and SHALL NOT instruct that provenance be recorded only in the body. It SHALL state that frontmatter is a closed contract, that inventing a field is `PRODUCT002`, and that the allowed fields can be read deterministically with `schema <kind>` rather than guessed.

Reasoning that is not part of the contract — which claims are observed, which inferred, what the evidence does not settle — SHALL remain in the artifact body.

#### Scenario: Candidates carry queryable provenance

- **WHEN** the skill drafts a candidate from evidence
- **THEN** the candidate's frontmatter records the source and the confidence

#### Scenario: The obsolete workaround is gone

- **WHEN** the skill's recorded procedure is read
- **THEN** it does not instruct recording provenance in a body subsection to avoid schema rejection
