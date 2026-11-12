---
'@prodshape/core': minor
'@prodshape/cli': minor
'@prodshape/distribution': patch
---

**BREAKING: the Product Snapshot is now the Product Explorer** (CHG-PRODUCT-EXPLORER).

- `prodshape graph --format html` is unchanged. It now writes `.product/generated/explorer.html` instead of `snapshot.html`, removes a `snapshot.html` an earlier release left there, and reports `Product Explorer written to …`.
- The page title is `Product Explorer` (`--product-name Lyceum` gives “Lyceum’s Product Explorer”), and its embedded data block is `#explorer-data`.
- `@prodshape/core` exports `buildExplorerHtml` and `ExplorerOptions` in place of `buildSnapshotHtml` and `SnapshotOptions`.
- `prodshape doctor` reports a leftover `snapshot.html` as informational, naming the new file.
- The `recover-product` skill names the real command for the review preview instead of a `prodshape snapshot` command that does not exist.

Migration: regenerate with `prodshape graph --format html`, and point any pipeline, script or link that reads `.product/generated/snapshot.html` at `.product/generated/explorer.html`. Library callers rename `buildSnapshotHtml` to `buildExplorerHtml`.
