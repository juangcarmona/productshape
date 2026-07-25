# Tasks — establish-product-definition-foundation

## 1. Documentation

- [ ] 1.1 Write `docs/manifesto.md`
- [ ] 1.2 Write `docs/methodology/` (overview, product-graph, define, recover, change, delivery-slicing, backlog-projection, sdd-handoff)
- [ ] 1.3 Write `docs/specification/` (index, terminology, artifacts, identifiers, relationships, product-changes, delivery-slices, handoff-contract, validation, conformance)
- [ ] 1.4 Write `docs/adoption/` (greenfield, brownfield, existing-repository, existing-openspec-repository)
- [ ] 1.5 Write `docs/architecture/overview.md` and ADRs 0001–0008
- [ ] 1.6 Write `docs/limitations-v0.1.md`
- [ ] 1.7 Rewrite `README.md` per the documentation-quality contract

## 2. Schemas and templates

- [ ] 2.1 Create `schemas/common.schema.json` with ID patterns and the three lifecycle enums
- [ ] 2.2 Create the nine artifact schemas
- [ ] 2.3 Create `product-change`, `delivery-slice`, `product-handoff`, `product-coverage` schemas
- [ ] 2.4 Create the thirteen templates, schema-conformant

## 3. Self-hosted product model

- [ ] 3.1 Create `docs/product/README.md` (self-hosting + bootstrap exception) and `changes/` tree with README
- [ ] 3.2 Author actors, journeys, use cases
- [ ] 3.3 Author business rules, domain terms, bounded contexts
- [ ] 3.4 Author functional requirements, quality requirements, constraints
- [ ] 3.5 Write `docs/product/model/index.md` (navigation only)
- [ ] 3.6 Create `.product/config.yaml`

## 4. Minimal core slice and conformance fixtures

- [ ] 4.1 Scaffold `packages/core` (package.json, tsconfig, tsup, vitest)
- [ ] 4.2 Implement artifact file parsing with LF normalization and sha256 digests
- [ ] 4.3 Implement the ajv schema registry and frontmatter validation with diagnostics
- [ ] 4.4 Create valid/invalid fixtures under `tests/fixtures` and `examples/{minimal,invalid}`
- [ ] 4.5 Write conformance tests (fixtures, templates, self-hosted model completeness and reference resolution)

## 5. Verification

- [ ] 5.1 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass
- [ ] 5.2 Cross-check docs for duplicated full explanations and normative conflicts
- [ ] 5.3 Validate the change with `openspec validate establish-product-definition-foundation`
