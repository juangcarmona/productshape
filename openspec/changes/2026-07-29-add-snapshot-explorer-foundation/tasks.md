# Tasks: add-snapshot-explorer-foundation

Product input: handoff `HOF-GITHUB-28`, slice `SLI-SNAPSHOT-003`, work item
`github:juangcarmona/productshape#28`.

## 0. Measurement harness and reference environment (prerequisite)

- [x] 0.1 Build the reusable measurement harness: opening-document composition (markup bytes,
      artifact-level nodes and edges), generated file size per authored byte, generation time per
      artifact, and in-browser interaction latency from a file opened over `file://`.
- [x] 0.2 Record the named reference environment — hardware, operating system, browser version —
      and store it alongside every recorded figure.
- [x] 0.3 Provide the three representative models: the current ProductShape model, plus synthetic
      models at roughly 5× and 10× containing dense relationships, high-degree artifacts, isolated
      artifacts, and long titles and bodies.
- [x] 0.4 Record the pre-change baseline for all three models so the improvement and any later
      regression are measurable against the same procedure.

## 1. Embedded data and the generation contract

- [x] 1.1 Serialize every artifact's frontmatter, authored body and status, plus the relationship
      structure, into the inert embedded data region, following the graph's existing deterministic
      sort and escaping `<` as the current index does.
- [x] 1.2 Remove artifact bodies from the generated markup; the opening markup carries the
      orientation view and the artifact list's identifying fields only.
- [x] 1.3 Unit tests: embedded data contains every artifact of the compiled model with its body,
      metadata and status; the opening markup contains no artifact body and no artifact-level graph
      node or edge.
- [x] 1.4 Unit tests: regeneration from identical model content is byte-identical; no timestamp,
      random value or environment-dependent content is emitted.

## 2. Orientation view

- [x] 2.1 Render product identity, source revision, total artifact and relationship counts, counts
      by kind with an entry point into each, and the plain-language generated read-only statement.
- [x] 2.2 Render the kind-level relationship aggregate: artifacts and relationships grouped by
      artifact kind and relationship type with exact counts.
- [x] 2.3 Render the neutral no-relationships group: exact count and artifact identities as entry
      points, with no warning presentation, severity, score or pejorative vocabulary.
- [x] 2.4 Unit tests: totals, per-kind counts and aggregate counts equal the compiled graph's;
      a model with only some kinds describes only those kinds; a model with no relationships
      renders an empty aggregate without breaking.
- [x] 2.5 Unit test: the orientation view asserts no importance, health, ownership, ranking or
      ordering — no derived count is rendered as a judgement.

## 3. Master–detail artifact reading

- [x] 3.1 Render the artifact list grouped by kind and narrowable by filters, with every artifact
      of the model selectable and a stable visible selected state.
- [x] 3.2 Render exactly one artifact detail on demand from embedded data: title, ID, kind, status,
      remaining metadata, and authored Markdown with the original heading hierarchy.
- [x] 3.3 Implement responsive behaviour: below the side-by-side threshold, list and detail become
      separate navigable states rather than a compressed desktop layout.
- [x] 3.4 Unit tests: exactly one detail is active and no other artifact's body is present in the
      document; every artifact is selectable across every kind; status is rendered and draft is
      distinguishable from active.
- [x] 3.5 Unit tests: escaping on both paths with one hostile fixture — a script element, an
      unclosed tag and an attribute-injection fragment — in an artifact body and in a metadata
      value, asserted on first render and after navigating away and back.

## 4. Selection state and fragment addressing

- [x] 4.1 Implement the single navigation mechanism owning all state transitions, with a state
      object carrying active view, selected artifact and a slot for the later graph mode.
- [x] 4.2 Implement fragment routes for orientation, the artifact list and a selected artifact; the
      address always reflects the page state and no surface mutates state directly.
- [x] 4.3 Implement the explicit unresolved-identifier state naming the identifier and offering
      orientation or the list as a way on.
- [x] 4.4 Implement legacy bare-identifier resolution with in-place normalization via history
      replacement, adding no redundant entry.
- [x] 4.5 Unit tests: route parsing and serialization round-trip; legacy fragment resolves and
      normalizes without a second history entry; unknown identifier produces the explicit state in
      both route forms; nothing is written to browser storage or cookies.
- [ ] 4.6 Verify in a browser from `file://` and from a static server: direct artifact links open on
      the artifact; Back and Forward restore visited views and selections; Back immediately after a
      legacy arrival leaves the page.

## 5. Presentation system

- [x] 5.1 Define the stylesheet once: single light appearance with no theme branch or control,
      system sans-serif prose, monospaced identifiers and revision values, strong contrast, thin
      borders, deliberate alignment, square or low-radius controls, compact density.
- [x] 5.2 Define one accent and the stable per-artifact-kind palette, with kind, status and
      selection each also carried by text, shape or position.
- [ ] 5.3 Verify by browser inspection and recorded screenshots at desktop and narrow viewports for
      the current and larger models: single light appearance under both environment preferences;
      monospaced identifiers everywhere they appear; one accent; each kind's colour identical across
      the delivered views and across two regenerations; no gradient, glass, illustration,
      hero typography or rounded-card treatment.
- [ ] 5.4 Verify with colour removed that kind, status and selection remain determinable.

## 6. Accessibility of the delivered surfaces

- [x] 6.1 Add semantic landmarks for every region and a heading outline with no skipped levels.
- [x] 6.2 Make orientation, filtering, selection and view navigation fully keyboard-operable with no
      trapped focus and no pointer-only control; ensure visible focus at every stop and deliberate
      focus placement after each view and selection change.
- [x] 6.3 Report the selected artifact with `aria-current` in the list and the active view as current
      in the page navigation; give every icon-only control an accessible name.
- [x] 6.4 Compute every text-and-background pair the delivered stylesheet can produce against WCAG
      2.1 AA, including the kind palette applied to text, and fix any failure.
- [x] 6.5 Ensure no needed information is hover-only and no non-essential animation runs under a
      reduced-motion preference.
- [ ] 6.6 Complete the delivered progression by keyboard alone on both the current-model and
      larger-model snapshots, and record the result.

## 7. Demotion of superseded surfaces without regression

- [x] 7.1 Remove the whole-model visualization from the opening view and reach it only on explicit
      request, leaving its behaviour otherwise unchanged.
- [x] 7.2 Carry the existing relationship lists and existing search forward unchanged inside the new
      structure so this increment regresses no shipped capability.
- [x] 7.3 Update the assertions from earlier slices that assumed all artifacts rendered
      simultaneously and a graph in the opening view.

## 8. Contract preservation, measurement and evidence

- [x] 8.1 Confirm exactly one self-contained HTML file with no external script, stylesheet, font,
      image or data, working from `file://` with networking disabled and from static hosting.
- [x] 8.2 Confirm nothing creates, edits, annotates, approves or persists anything, and that
      browser storage and cookies remain empty after exploring.
- [x] 8.3 Measure and record for all three representative models: opening-document markup bytes and
      artifact-level graph elements, generated size per authored byte, generation time per artifact.
- [x] 8.4 Measure and record artifact-selection latency for the longest-bodied and most-connected
      artifacts across all three models on the reference environment; report the distribution
      including the slowest cases.
- [x] 8.5 Derive the artifact-selection latency budget from the recorded figures and record it. This
      is a prerequisite of implementation approval, not an outcome of implementation.
- [ ] 8.6 Confirm the longest-titled and longest-bodied artifacts remain readable at every measured
      scale, wrapping within their containers with no horizontal page scrolling.
- [x] 8.7 Full test suite, lint and format check.
- [x] 8.8 Record coverage evidence for this change's requirements in `product-coverage.yaml`,
      including the partial-coverage scopes `SLI-SNAPSHOT-003` declares.

## Notes on verification depth

Everything checked above is automated: the generation-side assertions inspect the produced document,
and the page's own embedded script is driven in a real DOM (jsdom 30) so routing, single-selection,
legacy-fragment normalization, escaping after navigating away and back, filtering, search and
persistence are exercised as a reader would exercise them. 282 tests pass.

**Five tasks remain unchecked because they need a browser, which this environment does not have.**
jsdom implements the DOM but performs no layout or paint, so it cannot confirm what a page looks
like or how it feels:

- **4.6** — direct links, Back/Forward and post-legacy Back in a real browser over `file://` and from
  a static server. The equivalent logic is covered by 4.5 in jsdom, including `history.length`
  after normalization; what is unconfirmed is real browser history behaviour, in particular whether
  `history.replaceState` is permitted on `file://` in the target browsers. The implementation falls
  back to a hash assignment if it is refused, which would add a history entry the spec forbids — this
  is the one place where a browser result could require a code change.
- **5.3** — visual review and recorded screenshots at desktop and narrow viewports for both models.
  Stylesheet-level facts (single light appearance, no theme branch, monospaced identifiers, one
  accent, stable kind palette, absence of gradients/glass/hero type) are asserted in tests; the
  rendered appearance is not.
- **5.4** — the colour-removed pass. Tests assert that kind, status and selection each carry a text
  or shape signal, which is the substance; rendering without colour is not performed.
- **6.6** — the end-to-end keyboard progression on both models. Landmarks, heading outline,
  `aria-current`, control labelling, contrast and reduced-motion are asserted; real focus traversal
  and focus-visible rendering are not.
- **8.6** — long titles and bodies wrapping without horizontal page scrolling, which is a layout
  property.

`measurements.md` records the same limitation for interaction latency and the selection budget
carries explicit headroom because of it.
