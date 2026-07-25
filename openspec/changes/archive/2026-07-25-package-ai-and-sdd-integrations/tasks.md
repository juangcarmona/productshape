# Tasks — package-ai-and-sdd-integrations

## 1. Canonical AI assets

- [x] 1.1 Six skills with the eleven mandatory sections, provider-independent
- [x] 1.2 Seven thin /product:* commands
- [x] 1.3 Four deterministic hook descriptors
- [x] 1.4 Conformance test: skill sections, command brevity, hook safety

## 2. Provider integrations and distribution

- [x] 2.1 integration-claude renderer (skills, commands, hooks fragment)
- [x] 2.2 integration-copilot renderer (skills, prompts, hook docs)
- [x] 2.3 distribution: asset bundling with sync test, managed headers, lock file
- [x] 2.4 distribution: init (structure, config, templates, next steps, --force safety)
- [x] 2.5 distribution: integration add/update/--check drift detection, doctor
- [x] 2.6 CLI: init, integration, doctor commands
- [x] 2.7 Snapshot tests for generated Claude and Copilot assets; e2e init test

## 3. OpenSpec adapter and closure warnings

- [x] 3.1 adapter-openspec: change location, coverage validation (PRODUCT043, evidence paths)
- [x] 3.2 CLI: coverage check
- [x] 3.3 Core: PRODUCT109 (slice affects outside closure), PRODUCT110 (handoff outside closure)
- [x] 3.4 Tests for coverage matrix and closure warnings

## 4. Dogfooding

- [x] 4.1 Create CHG-TRACEABILITY-001 (add UC-COVERAGE-001; modify FR-COVERAGE-001,
      JRN-SDD-HANDOFF-001) with slices and open questions resolved
- [x] 4.2 Approve, slice (SLI-TRACEABILITY-001), commit, record synthetic GitHub work item
- [x] 4.3 Generate handoff into native OpenSpec change add-coverage-validation
- [x] 4.4 Implement the native change; map product-coverage.yaml to specs and tests
- [x] 4.5 coverage check green; handoff current; slice completed; change implemented
- [x] 4.6 Promote with --dry-run then execute; baseline revalidates
- [x] 4.7 Traceability-chain conformance fixture

## 5. Release candidate

- [x] 5.1 ci.yml (3-OS matrix, self-application, integration drift check) and conformance.yml
- [x] 5.2 README, limitations-v0.1.md and CHANGELOG updated to implemented reality
- [x] 5.3 Full suite green; both OpenSpec changes archived
