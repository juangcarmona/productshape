---
"@prodshape/core": major
"@prodshape/cli": major
"@prodshape/adapter-openspec": major
"@prodshape/distribution": major
---

Retire the push pipeline (Product Change, Delivery Slice, Product Handoff, overlay validation, promote, bootstrap exception) and implement the citation contract (RFC #4).

**Breaking changes:**
- Removed `prodshape change`, `prodshape handoff`, `prodshape coverage` commands.
- Removed `--change` and `--sdd` options from `prodshape validate` and `prodshape init`.
- Removed core modules: `changes.ts`, `slices.ts`, `overlay.ts`, `promote.ts`, `handoff.ts`, `references.ts`, `closure.ts`.
- Removed schemas: `product-change`, `delivery-slice`, `product-handoff`, `product-coverage`.
- Removed templates: `product-change.md`, `delivery-slice.yaml`, `product-context.md`, `product-handoff.yaml`.
- Removed skills: `analyze-product-change`, `slice-product-change`, `prepare-sdd-handoff`.
- Removed hooks: `validate-product-change`, `validate-before-handoff`, `verify-traceability`, `check-handoff-staleness`.
- Removed config keys: `product.changes`, `integrations.sdd`.
- Removed `changeScaffoldDirs` from distribution exports.
- `adapter-openspec` reduced to `locateOpenSpecChange` only (removed `checkCoverage`, `checkSliceEvidence`, `findChangeHandoffDirs`).
- Retired diagnostics PRODUCT020–027, 030–032, 040, 041, 043, 044, 108–110 (codes reserved, never reused).

**New features:**
- `prodshape cite` — emit a citation record (inline, marker-block, or sidecar-ledger form).
- `prodshape citations verify` — scan consumer documents and report citation statuses.
- `verification[].id` — optional stable scenario id on FR/QR artifacts (citable via anchor).
- New diagnostics: PRODUCT060 (unresolved citation), PRODUCT061 (stale citation, warning), PRODUCT062 (tampered projection), PRODUCT063 (anchor not found). PRODUCT042 generalized to citation digests.
- Schema vendoring: `pnpm schemas:sync` copies normative schemas from the spec repo.
- Product-model changes now happen via native pull requests (change-as-PR).

See [RFC #4](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0004-delivery-model-reset.md) and [issue #52](https://github.com/juangcarmona/productshape/issues/52) for details.
