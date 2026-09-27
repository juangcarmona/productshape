<!-- pdac-scope: cited -->

## Why

Product Change **CHG-SNAPSHOT-005** has been approved and applied to the baseline. It redefines how the Product Explorer's shell presents the model:

- light and dark appearances;
- search as an action;
- a master area that keeps the reader's place;
- linked identifiers;
- kind icons;
- Overview entry points.

The generator still implements the previous definition. This change delivers it in `buildSnapshotHtml`. It also removes a spec requirement ("graph mode is part of the address") that the single-pane Explorer no longer has a mode for.

## What Changes

- **Two appearances.** Light and dark, following the environment by default, with one light / dark / system control held in the address. All colours become per-appearance tokens, including the kind palette (revised for distinguishability) and the projection's strokes.
- **Search as a dialog.**
  - It opens from a header control, `/` and `Ctrl+K` on every surface, and closes with Escape, returning focus.
  - The dialog holds the ranked search and chips for the canonical narrowing (kind, status, context).
  - The fixed filter form in the master area is removed, and the separate name/ID filter merges into search.
- **Visible narrowing.** Active filters appear as removable chips above the list, with one step to clear them all.
- **Master area.**
  - Kinds become collapsible groups. The group holding the selection opens, is marked (rule plus text marker) and keeps the entry in view.
  - The whole master area collapses to a rail of kind icons marking the selected kind (`Ctrl+B`).
  - The address carries the collapse.
- **Kind icons.** One inline SVG icon per kind, created by the application script rather than the opening document, shown beside every kind token.
- **Reader.**
  - Metadata identifiers become links, and known identifiers in the authored body become links with the text otherwise unchanged.
  - Previous / next within the current list, with the position in the kind.
  - Copy ID and copy link.
  - Relationship group headers with direction, readable verb, kind and count, and a declares / referenced-by summary.
- **Focused Topology.**
  - Relationship groups are laid out in rows: declared groups above the anchor, referencing groups below, so they never overlap.
  - Opening a group lists its members beside it as selectable entries.
  - Groups highlight their counterpart in the Reader and back, and the Reader/topology split is resizable.
  - **BREAKING (spec):** the orbit, pan and zoom requirements are replaced.
- **Overview.**
  - Two columns: identity, totals, composition and the derived entry points on one side, and the kind-by-kind grid plus the aggregate by relationship type on the other.
  - Entry points: journeys in step order, contexts by reference count, and the artifacts with the most relationships.
- **Header.** A compact one-line header with a short revision (the full revision stays visible on the Overview).
- **Spec cleanup.** REMOVED "The active graph mode is part of the addressable state".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `snapshot-generation`:
  - Appearance and presentation.
  - Accessibility.
  - Search invocation and narrowing.
  - Orientation entry points.
  - Addressable presentation state.
  - Catalog narrowing visibility.
  - Master-area grouping and collapse.
  - Reader identifier links and stepping.
  - Focused Topology layout.
  - Removal of the graph-mode requirement.

## Impacted product artifacts

Modified by CHG-SNAPSHOT-005 and implemented here:

<!-- pdac:cite id="QR-PRESENTATION-001" digest="sha256:d16a3c4eb8a38f0282d47a962ec3822bcd882f1910131d504ed0d2ed75352e88" -->
<!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->
<!-- pdac:cite id="FR-SNAPSHOT-002" digest="sha256:426d0203a9491acef6dd97281ad967d545070f6fe14208ba5f77f13da2f8fc5a" -->
<!-- pdac:cite id="FR-SNAPSHOT-003" digest="sha256:e943d44f1e487316d7c50a59534c220a155da3387a93954a882be0754a615b07" -->
<!-- pdac:cite id="FR-SNAPSHOT-004" digest="sha256:79141d7904dd9088a5f0643acb9217c0badc0e6356e4053b6fcf4c817c35b5ec" -->
<!-- pdac:cite id="FR-SNAPSHOT-006" digest="sha256:b29e1faa337fb90b5dcac8b9ddeb92325c7acb2c29a2b18bb512ec2e6be7bf3f" -->
<!-- pdac:cite id="FR-SNAPSHOT-008" digest="sha256:b9ae2520c7778c6c7a90d1866db57873cfa0fe5e2995a05b8786a7797efd281a" -->

Unchanged and binding on the new behaviour:

- **FR-SNAPSHOT-005:** two projections, no whole graph.
- **FR-SNAPSHOT-009:** the Focused Topology, whose layout is free.
- **CON-NO-WEB-UI:** offline, no storage, the address is the only state.
- **QR-SCALABILITY-001:** the opening document is bounded. The icons are created at run time for this reason.
- **TERM-FOCUSED-TOPOLOGY.**
- **UC-SNAPSHOT-EXPLORE-001.**

<!-- pdac:cite id="FR-SNAPSHOT-005" digest="sha256:6f4280d6db76da8e0188db3dbb63e55d8df4ea045950cea506a50beae1d9259b" -->
<!-- pdac:cite id="FR-SNAPSHOT-009" digest="sha256:ab9721cb7fb71a07fa8a48789379024ecd0eeda9122267329ee3dcbc20718ff7" -->
<!-- pdac:cite id="CON-NO-WEB-UI" digest="sha256:467b7a87238629673c45dac7b72e85e4cb17a969cbcdbf6f4bf5d1711209ddbf" -->
<!-- pdac:cite id="QR-SCALABILITY-001" digest="sha256:ce964e20dec3fb9facb301afb75ef2026c908a05ea56b11f3de1981522a7dfe1" -->
<!-- pdac:cite id="TERM-FOCUSED-TOPOLOGY" digest="sha256:0078e5754fc215a6bdde6b601ac543c391491356666cc36265c26e83fa134595" -->
<!-- pdac:cite id="UC-SNAPSHOT-EXPLORE-001" digest="sha256:e01c2aef22e7a7d9ab7bfe03b1f4a9287872fae6e6cb8be88529db126b88652b" -->

I also checked the neighbours that `prodshape impact` reports for FR-SNAPSHOT-002 and left them out, because the change doesn't alter their semantics: BR-RELATIONSHIPS-001, ACT-PRODUCT-EXPLORER, BC-PRODUCT-DEFINITION, BR-CANONICAL-001, and the snapshot domain terms.

## Impact

- **Code:** `packages/core/src/snapshot.ts` (stylesheet, markup skeleton, application script) and `packages/core/src/snapshot.test.ts`.
- **Evidence and docs:** `scripts/screenshot-snapshot.mts` gains appearance and collapsed-panel shots, `docs/assets/snapshot/*` are refreshed, and a changeset is added for `@prodshape/core` and `@prodshape/cli`.
- **Addresses:** old addresses keep working. `?f=` still narrows and shows as a chip, and the legacy and withdrawn graph routes still resolve.
- **Out of scope:** phone-width improvements beyond preserving the narrow-viewport behaviour, and any change to what the projections may show.
