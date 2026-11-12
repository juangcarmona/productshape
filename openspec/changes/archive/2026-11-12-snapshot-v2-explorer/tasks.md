<!-- pdac-scope: cited -->

## 1. Product Change

- [x] 1.1 Author CHG-SNAPSHOT-V2 revising FR-SNAPSHOT-PROJECTIONS, FR-SNAPSHOT-ORIENTATION, FR-SNAPSHOT-TOPOLOGY, FR-SNAPSHOT-ADDRESSING, QR-PRESENTATION, QR-SCALABILITY, the Explorer's terms, UC-SNAPSHOT-EXPLORE and JRN-SNAPSHOT, and adding FR-SNAPSHOT-BUSINESS-LENS. Validate the overlay, record the approval and apply it.

<!-- pdac:cite id="UC-SNAPSHOT-EXPLORE" digest="sha256:3033f2cde457e34b1e0ce87ccb4e8f18b6e6c1916b9b9c2d3b1a1debdf366e4f" -->

## 2. Map engine

- [x] 2.1 Replace the Focused Topology and splitter with a shared map engine: plane, camera, fit, drag, wheel, pinch, zoom controls, roving tab stop, spatial arrow navigation, attention lighting and the summary card. Verify with DOM tests for hover, focus, arrows, controls and keys.
- [x] 2.2 Deterministic ordering and context grouping with a "No single context" fallback. Verify with a test that a context-less use case is drawn, and with a test that draws every map with the clock and `Math.random` unavailable.

<!-- pdac:cite id="FR-SNAPSHOT-PROJECTIONS" digest="sha256:7ab7050a644bbe3f1fd7dc38bda0c2037d5ae01348dad95fcf67bea914bfe137" -->

## 3. Views

- [x] 3.1 Overview map under a compact orientation strip, with the existing facts below. Verify one tile per kind, one chip per artifact, no line at open, and click or Enter to focus.
- [x] 3.2 Focus view with kind groups on fixed sides, dense-group collapse, `x` disclosure in place, background marks, breadcrumb, Enter-to-read, and the `#/graph/focus/ID` redirect. Verify with DOM tests.
- [x] 3.3 Columns view in the stated order, every relationship drawn once, select, clear and double-click to focus. Verify with DOM tests.
- [x] 3.4 Reader: remove the topology pane and add the Focus action.

<!-- pdac:cite id="FR-SNAPSHOT-TOPOLOGY" digest="sha256:9680d19b034f9502cac05ca24f027c8d31bb4bd0ee7a91ab773915e89becd574" -->
<!-- pdac:cite id="FR-SNAPSHOT-ADDRESSING" digest="sha256:1ae12988f863368b278b6a9d2f0413389a092f7f2d043ae6f1fad7d4da3b52e7" -->

## 4. Business lens

- [x] 4.1 Embed `q` (one-hop impact) and `gwt` (given/when/then) in the data block.
- [x] 4.2 Add the lens toggle and `l` key with `l=b` in the address. Add the business card for use cases, the plain card for other kinds, plain verbs in the Focus view, and the lens card in the Reader. Verify content, the absence of identifiers and relationship names, empty-section wording, escaping, and that turning it off restores the previous presentation.

<!-- pdac:cite id="FR-SNAPSHOT-BUSINESS-LENS" digest="sha256:17d95ec61b7315ddcaa84ff9bffb1c1fccc7d360501ab2d8d49f7cbd83b29fd3" -->

## 5. Evidence

- [x] 5.1 Measure the map views at 1×, 5× and 10× with `pnpm measure:snapshot`.
- [x] 5.2 Capture every view in both appearances with `pnpm shots:snapshot`.
- [x] 5.3 Fold the delta into `openspec/specs/snapshot-generation/spec.md` and refresh its citations.

<!-- pdac:cite id="QR-SCALABILITY" digest="sha256:9da28eea667bea855b3fc7726c0b9d67ec338041332cf3f23a6059b4591a1050" -->
<!-- pdac:cite id="QR-PRESENTATION" digest="sha256:7656c1278f5e0ba93b2051df3163321697a5064d2f7e3bdad634be1589a18784" -->
