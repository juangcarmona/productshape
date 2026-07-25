# Tasks — implement-product-graph-core

## 1. Core model loading and validation

- [ ] 1.1 Configuration loading with defaults and PRODUCT050 rejection
- [ ] 1.2 Artifact discovery (fast-glob, POSIX paths, index.md exempt)
- [ ] 1.3 Model loading (parse + schema + body sections per artifact, digests)
- [ ] 1.4 Relationship table as shared data
- [ ] 1.5 Baseline validation: PRODUCT005–008 errors
- [ ] 1.6 Warnings PRODUCT101–107 with config gating
- [ ] 1.7 Unit tests for each diagnostic

## 2. Graph, inspect, impact, outputs

- [ ] 2.1 Graph compilation with derived incoming indexes, deterministic ordering
- [ ] 2.2 Generated outputs: product-graph.json (versioned), product-index.json,
      traceability.json, product-graph.mmd, diagnostics.json
- [ ] 2.3 Inspect report (metadata, outgoing, derived incoming)
- [ ] 2.4 Impact traversal (direct/transitive, direction, depth)
- [ ] 2.5 Unit and golden tests (graph JSON, mermaid snapshots)

## 3. CLI

- [ ] 3.1 Package scaffold with `product-definition` bin
- [ ] 3.2 validate / graph / inspect / impact commands, --format json
- [ ] 3.3 Exit codes 0/1/2/3 and root/config resolution
- [ ] 3.4 CLI tests

## 4. Conformance and self-application

- [ ] 4.1 Reference-level fixtures: duplicate ID, missing target, disallowed target,
      active-to-retired
- [ ] 4.2 Self-model validates through the full pipeline in tests
- [ ] 4.3 Run the built CLI against this repository
- [ ] 4.4 lint, typecheck, test, build all green
