---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/adapter-openspec': minor
'@prodshape/distribution': minor
---

Retire the delivery pipeline and implement the citation contract (RFC #4). The Product Definition evolves through Product Changes: validated as overlays, approved by a human, materialized by an explicit apply, and accepted when a human merges the pull request carrying the result.

**Breaking changes:**

- Removed `prodshape handoff` and `prodshape coverage` commands, and `prodshape change promote` in favour of `prodshape change apply`.
- Removed `--change` and `--sdd` options from `prodshape validate` and `prodshape init`.
- Removed core modules: `slices.ts`, `promote.ts`, `handoff.ts`, `references.ts`, `closure.ts`.
- Removed schemas: `delivery-slice`, `product-handoff`, `product-coverage`.
- Removed templates: `delivery-slice.yaml`, `product-context.md`, `product-handoff.yaml`.
- Removed skills: `slice-product-change`, `prepare-sdd-handoff`.
- Removed hooks: `validate-product-change`, `validate-before-handoff`, `verify-traceability`, `check-handoff-staleness`.
- Removed config key `integrations.sdd`.
- `adapter-openspec` reduced to `locateOpenSpecChange` only (removed `checkCoverage`, `checkSliceEvidence`, `findChangeHandoffDirs`).
- Retired diagnostics PRODUCT030-032, 040, 041, 043, 044, 109 and 110 (codes reserved, never reused).
- The `product-change` status enum is `draft`, `proposed`, `approved`, `applied`, `rejected`, `superseded`. `in-progress` and `implemented` are gone: whether accepted intent has been built is a fact about delivery, not about the product.
- Change directories are `changes/active/<chg-id>/` with `proposed/`, archived to `changes/completed/` or `changes/rejected/`.

**New features:**

- `prodshape cite` emits a citation record (inline, marker-block, or sidecar-ledger form).
- `prodshape citations verify` scans consumer documents and reports citation statuses.
- `prodshape change validate [id]` compiles each live change into an overlay on the baseline and validates the result end to end, touching no baseline file.
- `prodshape change apply <id> [--dry-run]` materializes an approved change, reports the product diff with each impacted artifact's resulting digest, and archives the change. It creates no commit and merges nothing: applying is not accepting.
- `prodshape change list [--all]` lists live changes, or the whole change history.
- `prodshape change archive <id>` files a rejected or superseded change.
- `verification[].id`: optional stable scenario id on FR and QR artifacts, citable via anchor.
- New diagnostics: PRODUCT020-027 for Product Changes and their overlays, PRODUCT060 (unresolved citation), PRODUCT061 (stale citation, warning), PRODUCT062 (tampered projection), PRODUCT063 (anchor not found), PRODUCT108 (approved with unresolved open questions, warning). PRODUCT042 generalized to citation digests.
- Schema vendoring: `pnpm schemas:sync` copies the normative schemas, including `product-change`, from the spec repository.
- `init` scaffolds `docs/product/changes/{active,completed,rejected}/`.

See [RFC #4](https://github.com/product-definition-as-code/spec/blob/main/rfcs/0004-delivery-model-reset.md) and [issue #52](https://github.com/juangcarmona/productshape/issues/52) for details.
