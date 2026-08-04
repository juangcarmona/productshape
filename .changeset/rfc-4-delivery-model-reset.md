---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/adapter-openspec': minor
'@prodshape/distribution': minor
---

Retire the push pipeline (Delivery Slice, Product Handoff, overlay validation, promotion, bootstrap exception) and implement the citation contract (RFC #4). The change drafting capability is recovered as a lightweight working-tree assistant where the pull request is the delivery mechanism.

**Breaking changes:**

- Removed `prodshape handoff` and `prodshape coverage` commands. `prodshape change` is recovered as a drafting assistant (`change validate`, `change list`, `change archive`).
- Removed `--change` and `--sdd` options from `prodshape validate` and `prodshape init`.
- Removed core modules: `overlay.ts`, `slices.ts`, `promote.ts`, `handoff.ts`, `references.ts`, `closure.ts`.
- Removed schemas: `delivery-slice`, `product-handoff`, `product-coverage`. The `product-change` schema is recovered as a non-normative change-draft document.
- Removed templates: `delivery-slice.yaml`, `product-context.md`, `product-handoff.yaml`. The `product-change.md` template is recovered.
- Removed skills: `slice-product-change`, `prepare-sdd-handoff`. The `analyze-product-change` skill is recovered (adapted to change-as-PR).
- Removed hooks: `validate-product-change`, `validate-before-handoff`, `verify-traceability`, `check-handoff-staleness`.
- Removed config keys: `product.changes`, `integrations.sdd`.
- Removed `changeScaffoldDirs` from distribution exports.
- `adapter-openspec` reduced to `locateOpenSpecChange` only (removed `checkCoverage`, `checkSliceEvidence`, `findChangeHandoffDirs`).
- Retired diagnostics PRODUCT020–027, 030–032, 040, 041, 043, 044, 108–110 (codes reserved, never reused).

**New features:**

- `prodshape cite` — emit a citation record (inline, marker-block, or sidecar-ledger form).
- `prodshape citations verify` — scan consumer documents and report citation statuses.
- `prodshape change validate` — validate the working tree as a proposed change, including each change draft against the change-draft schema.
- `prodshape change list` — list change drafts under `docs/product/changes/`.
- `prodshape change archive` — archive a change draft after its PR is merged.
- `verification[].id` — optional stable scenario id on FR/QR artifacts (citable via anchor).
- New diagnostics: PRODUCT060 (unresolved citation), PRODUCT061 (stale citation, warning), PRODUCT062 (tampered projection), PRODUCT063 (anchor not found), PRODUCT112 (change draft lists an `affected-artifacts` ID the model does not contain, warning). PRODUCT042 generalized to citation digests.
- Schema vendoring: `pnpm schemas:sync` copies normative schemas from the spec repo.
- Product-model changes now happen via native pull requests (change-as-PR).

See [RFC #4](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0004-delivery-model-reset.md) and [issue #52](https://github.com/juangcarmona/productshape/issues/52) for details.
