# Tasks — establish-product-definition-foundation

## 1. Documentation

- [x] 1.1 Write `docs/manifesto.md`
- [x] 1.2 Write `docs/methodology/` (overview, product-graph, define, recover, change, delivery-slicing, backlog-projection, sdd-handoff)
- [x] 1.3 Write `docs/specification/` (index, terminology, artifacts, identifiers, relationships, product-changes, delivery-slices, handoff-contract, validation, conformance)
- [x] 1.4 Write `docs/adoption/` (greenfield, brownfield, existing-repository, existing-openspec-repository)
- [x] 1.5 Write `docs/architecture/overview.md` and ADRs 0001–0008
- [x] 1.6 Write `docs/limitations-v0.1.md`
- [x] 1.7 Rewrite `README.md` per the documentation-quality contract

## 2. Schemas and templates

- [x] 2.1 Create `schemas/common.schema.json` with ID patterns and the three lifecycle enums
- [x] 2.2 Create the nine artifact schemas
- [x] 2.3 Create `product-change`, `delivery-slice`, `product-handoff`, `product-coverage` schemas
- [x] 2.4 Create the thirteen templates, schema-conformant

## 3. Self-hosted product model

- [x] 3.1 Create `docs/product/README.md` (self-hosting + bootstrap exception) and `changes/` tree with README
- [x] 3.2 Author actors, journeys, use cases
- [x] 3.3 Author business rules, domain terms, bounded contexts
- [x] 3.4 Author functional requirements, quality requirements, constraints
- [x] 3.5 Write `docs/product/model/index.md` (navigation only)
- [x] 3.6 Create `.product/config.yaml`

## 4. Minimal core slice and conformance fixtures

- [x] 4.1 Scaffold `packages/core` (package.json, tsconfig, tsup, vitest)
- [x] 4.2 Implement artifact file parsing with LF normalization and sha256 digests
- [x] 4.3 Implement the ajv schema registry and frontmatter validation with diagnostics
- [x] 4.4 Create valid/invalid fixtures under `tests/fixtures` and `examples/{minimal,invalid}`
- [x] 4.5 Write conformance tests (fixtures, templates, self-hosted model completeness and reference resolution)

## 5. Verification

- [x] 5.1 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass
- [x] 5.2 Cross-check docs for duplicated full explanations and normative conflicts
- [x] 5.3 Validate the change with `openspec validate establish-product-definition-foundation`
