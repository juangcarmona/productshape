# Establish Product Definition Foundation

## Why

AI-assisted engineering accelerates implementation, which moves the limiting factor left: understanding the product, its actors, behaviour, rules, language and requirements. No canonical, versioned, machine-validatable representation of that knowledge exists in this repository (or in most repositories). This change establishes the founding methodology, the normative specification, the artifact contracts and the repository's own product model, so every later implementation change builds on fixed, reviewable semantics.

## What Changes

- Add the manifesto and the methodology documentation (overview, product graph, define, recover, change, delivery slicing, backlog projection, SDD handoff).
- Add the normative specification (terminology, artifacts, identifiers, relationships, product changes, delivery slices, handoff contract, validation, conformance).
- Add eight architecture decision records fixing the founding constraints.
- Add JSON Schemas for all artifact kinds, with schema-specific lifecycle enums.
- Add authoring templates that conform to those schemas.
- Add the repository's own initial product model under `docs/product/model` (initial-baseline bootstrap exception), plus `.product/config.yaml`.
- Add adoption guides (greenfield, brownfield, existing repository, existing OpenSpec repository) and `docs/limitations-v0.1.md`.
- Add valid and invalid conformance fixtures with a minimal deterministic parsing and schema-validation slice in `packages/core` (test harness scope only — the full CLI arrives in `implement-product-graph-core`).

## Capabilities

### New Capabilities

- `methodology-docs`: Human-facing explanation of the methodology — the product graph, the three operations (Define, Recover, Change), delivery slicing, backlog projection and SDD handoff — understandable in under five minutes.
- `normative-specification`: RFC-style normative contracts for artifact types, identifiers, relationships, lifecycle states, Product Changes, delivery slices, the handoff contract, validation diagnostics and conformance.
- `artifact-schemas`: JSON Schemas and conformant authoring templates for every artifact kind.
- `self-hosted-product-model`: The repository's own coherent, traceable product model describing the adoption and change workflow.
- `artifact-parsing`: Deterministic parsing of Markdown artifacts (frontmatter extraction) and JSON Schema validation, exercised by conformance fixtures.

### Modified Capabilities

_None — this is the first change._

## Impact

- New directories: `docs/`, `docs/product/`, `schemas/`, `templates/`, `.product/`, `tests/`, `examples/`, `packages/core`.
- New dev dependencies inside `packages/core`: `gray-matter`, `yaml`, `ajv`, `ajv-formats` (all pre-approved).
- No CLI, no graph compilation, no change overlays yet — those are allocated to `implement-product-graph-core` and `implement-product-change-and-handoff`.
- Establishes the immutable artifact IDs of the baseline model; IDs must never be reused afterwards.
