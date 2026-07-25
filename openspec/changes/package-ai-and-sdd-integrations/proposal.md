# Package AI and SDD Integrations

## Why

The deterministic core and the Product Change lifecycle work end to end, but nothing packages the
methodology for its users yet: no canonical AI skills, no generated provider integrations, no
installation into consumer repositories, no OpenSpec adapter, and no proof that the whole workflow
closes the loop. This change delivers v0.1's distribution surface and demonstrates the complete
traceability chain on this repository itself.

## What Changes

- Add the six canonical skills (`skills/`), seven thin user-facing commands (`commands/`,
  namespace `/product:*`) and four deterministic hook descriptors (`hooks/`).
- Add `packages/integration-claude` and `packages/integration-copilot`: provider renderers
  exported through structural contracts, no internal package dependencies.
- Add `packages/distribution`: consumer initialization (`init`), provider asset generation with
  managed-file headers, `installation.lock.json`, `integration add/update [--check]`, drift
  detection (PRODUCT051/052) and `doctor`.
- Add `packages/adapter-openspec`: locating native OpenSpec changes, sidecar placement,
  `product-coverage.yaml` validation and uncovered-requirement reporting (PRODUCT043) through a
  new `coverage check` CLI command.
- Emit the closure-quality warnings PRODUCT109 (slice affects outside its requirements' closure)
  and PRODUCT110 (handoff artifacts outside the recomputed closure).
- Dogfood the methodology end to end: Product Change `CHG-TRACEABILITY-001`, delivery slice,
  synthetic GitHub work-item reference, handoff into a native OpenSpec change, implementation,
  coverage evidence, verification and explicit promotion into the baseline.
- Add CI (`ci.yml` with a Linux/Windows/macOS matrix and self-application, `conformance.yml`)
  and prepare the repository as a v0.1.0 release candidate (README, limitations, CHANGELOG).

## Capabilities

### New Capabilities

- `ai-skills`: Canonical, provider-independent skills, commands and hook descriptors.
- `distribution`: Consumer initialization, generated provider integrations, managed-file
  lifecycle and doctor.
- `openspec-adapter`: Sidecar artifacts inside native OpenSpec changes and deterministic
  requirement-coverage validation.

### Modified Capabilities

- `delivery-slices`: Slice validation additionally warns when a slice affects artifacts outside
  its requirements' closure (PRODUCT109).
- `product-handoff`: Handoff status additionally warns when a handoff lists artifacts outside
  the recomputed closure (PRODUCT110).

## Impact

- New packages: distribution, integration-claude, integration-copilot, adapter-openspec; CLI
  gains `init`, `integration`, `doctor` and `coverage check`.
- Canonical assets bundled into the distribution package (sync-tested against the repository
  root, like core's schemas).
- The self-hosted baseline evolves through promotion of `CHG-TRACEABILITY-001`: `UC-COVERAGE-001`
  added, `FR-COVERAGE-001` and `JRN-SDD-HANDOFF-001` modified.
- `.github/workflows/` created. No npm publish and no GitHub release in this change.
