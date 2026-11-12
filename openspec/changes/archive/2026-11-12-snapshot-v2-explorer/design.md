<!-- pdac-scope: cited -->

## Context

The application block in `snapshot.ts` already owns routing, addressing, appearance, the Catalog, the Reader and ranked search, and renders everything from one inert JSON data block. The map views are added to that same block, so the file stays one static string. Regenerating from identical content stays byte-identical.

## Decisions

- **Layout runs in the page, from the data.** The static markup holds only an empty viewport per map. The application draws chips, boxes and lines when a view first opens. The static markup stays bounded by kinds, and the drawing cost is paid only by views the reader opens.
- **Deterministic ordering.** Within a kind, artifacts are sorted by context group, then by the mean row of their neighbours in other columns, over eight alternating sweeps, ties by identifier. The Focus view's background uses a mulberry32 shuffle with a fixed seed over a ring of grid slots, grown until every other artifact has a slot. No `Date`, no `Math.random`. A test runs with both made unavailable.
- **Viewport-independent geometry.** The Overview tiles flow into rows of a width derived from their total area. Only the camera fit depends on the viewport. The same address therefore gives the same drawing on every screen, scaled.
- **One tab stop per map (roving tabindex).** Arrow keys move to the nearest drawn artifact in a direction (primary distance plus twice the cross distance). Enter mirrors click. The camera pans to keep the focused artifact in view.
- **Context grouping reads the graph, not frontmatter.** It uses the `bounded-context` (use case) and `defined-in` (domain term) edges. Exactly one target gives a group. Zero or several give a "No single context" group sorted last.
- **One-hop impact is computed by the generator** with `putInQuestionBy`, the function `prodshape impact` uses. The page does not re-derive relationship polarity.
- **The lens docks its card** to the right of wide viewports, and the camera fits into the remaining width.
- **The neon highlight** is a box-shadow and an SVG drop-shadow in the kind colour, with per-appearance strength tokens (`--glow-near`, `--glow-far`, `--glow-line`, `--dim`). The lit state also thickens the border, and everything else dims, so it survives without colour.

<!-- pdac:cite id="QR-DETERMINISM" digest="sha256:3f52f1051dbd065f0bcdfa951ffb2fdcf3b16265f3080c325931e83cbf9f86f2" -->
<!-- pdac:cite id="QR-PRESENTATION" digest="sha256:7656c1278f5e0ba93b2051df3163321697a5064d2f7e3bdad634be1589a18784" -->
<!-- pdac:cite id="QR-SCALABILITY" digest="sha256:9da28eea667bea855b3fc7726c0b9d67ec338041332cf3f23a6059b4591a1050" -->

## Risks

- The Overview map at ten times the reference model draws several hundred chips at open. The measured jsdom figures are in the PR; browser paint is not measured by the harness.
- Hovering on touch devices is replaced by tap-to-focus. Neighbourhood lighting on touch comes from keyboard focus and selection, not from hover.
