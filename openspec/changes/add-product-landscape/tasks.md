# Tasks: add-product-landscape

Product input: handoff `HOF-GITHUB-38`, slice `SLI-SNAPSHOT-007`, work item
`github:juangcarmona/productshape/issues/38`.

## 1. The landscape

- [x] 1.1 Replace the layered map renderer with the Product Landscape: four bands as permanently visible
      lanes, every artifact kind in its fixed band, only populated bands rendered.
- [x] 1.2 Lay artifacts out on a deterministic grid within each band, grouped by kind in the fixed kind
      order and filling columns then rows in the compiled graph's own sort order.
- [x] 1.3 Render every artifact as its own node: kind-coloured accent bar, title as primary identity,
      identifier as secondary, full title in the accessible name and tooltip.
- [x] 1.4 Delete the counted cells, the rendered-artifact budget and the aggregate connectors.
- [x] 1.5 Keep selection wired to the existing router without changing what selection means.
- [x] 1.6 Unit tests: band assignment for all nine kinds; identical assignment across two unrelated
      models; only populated bands rendered; nothing implying order or causality between bands; one node
      per compiled artifact with no counts standing in for artifacts; no node absent from the graph.

## 2. Navigation to readable detail

- [x] 2.1 Pan by drag, zoom by scroll about the pointer, and a fitted view, with zoom bounded either side
      of the fit.
- [x] 2.2 Text-labelled zoom in, zoom out and fit controls.
- [x] 2.3 Keyboard equivalents: arrow keys pan, `+` and `-` zoom, `0` fits.
- [x] 2.4 Unit tests: the controls and the keyboard both move and restore the view.

## 3. Stable deterministic placement

- [x] 3.1 Derive every position from the compiled model alone — no seeding, no relaxation, no dependence
      on rendered text metrics.
- [x] 3.2 Unit tests: two renders from identical content place every artifact identically; positions are
      unchanged after panning and zooming; two builds of the same model produce the same geometry.

## 4. Presentation and accessibility for this slice's surfaces

- [x] 4.1 Kind colour as an accent rather than a filled surface; the background node state within the
      established presentation system.
- [x] 4.2 Every node reachable and selectable by keyboard alone, with visible focus and no pointer-only
      path.
- [x] 4.3 The landscape placed in the landmark and heading structure without skipping a level.
- [x] 4.4 Band and kind determinable with colour removed; no needed information hover-only; no
      non-essential animation under a reduced-motion preference.
- [x] 4.5 Every text-and-background pair introduced here meets WCAG 2.1 AA.

## 5. Scale, evidence and contract

- [x] 5.1 Extend the measurement harness with the SLI-SNAPSHOT-007 landscape integrity properties, and
      with landscape-render latency sampled well enough to support a 95th percentile.
- [x] 5.2 Measure at all three reference scales including 730 artifacts; record every figure with the
      reference environment.
- [x] 5.3 Verify whole-landscape rendering against the canonical 250 ms p95 budget at every reference
      scale, recording the sampling protocol and the slowest sample alongside the percentile.
- [x] 5.4 Confirm artifact-selection and search latency have not regressed against their existing budgets.
- [x] 5.5 Confirm generated size per authored byte and generation time per artifact do not increase with
      model size, and that regeneration is byte-identical.
- [x] 5.6 Screenshots for human review: the landscape fitted at 81 artifacts, readable-detail zoom
      showing title-first nodes, the complete landscape at 730 artifacts, a narrow viewport, keyboard
      focus, and a colour-removed pass.
- [x] 5.7 Full test suite, lint, typecheck and format check; record coverage evidence.
