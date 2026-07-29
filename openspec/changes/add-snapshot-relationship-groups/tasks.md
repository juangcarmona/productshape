# Tasks: add-snapshot-relationship-groups

Product input: handoff `HOF-GITHUB-31`, slice `SLI-SNAPSHOT-004`, work item
`github:juangcarmona/productshape/issues/31`.

## 1. Grouping

- [x] 1.1 Build the group model in the embedded application: for the selected artifact, partition each
      direction's edges by relationship type and then by the artifact kind at the other end, ordered by
      the graph's existing edge sort.
- [x] 1.2 Render each group with its label — relationship type and other-end kind — and its exact count.
- [x] 1.3 Render a direction's members directly, without a group wrapper, when that direction has only
      one group, so artifacts with few relationships stay simple.
- [x] 1.4 Unit tests: group labels and counts sum to exactly the compiled graph's edges per direction;
      grouping and member order are identical across two builds.

## 2. Collapse and expansion

- [x] 2.1 Render groups of more than eight members collapsed, using `<details>`/`<summary>` with the
      count in the summary; render smaller groups expanded.
- [x] 2.2 Build a collapsed group's members only when it first opens.
- [x] 2.3 Style the disclosure to match the presentation system established in SLI-SNAPSHOT-003.
- [x] 2.4 Unit tests: a group above the threshold starts collapsed and contains no member elements;
      expanding reveals exactly the counted number; expanded state is exposed as state; a group below
      the threshold starts open.

## 3. Completeness and navigation

- [x] 3.1 Keep declared and derived directions separately labelled, each entry naming its relationship
      type and direction, each related artifact selectable in one step.
- [x] 3.2 Keep reporting the absence of relationships in both directions for an isolated artifact.
- [x] 3.3 Escape related-artifact titles rendered from the embedded data.
- [x] 3.4 Unit tests: every relationship the compiled graph records for an artifact is reachable as text
      including inside collapsed groups once expanded; a hostile title renders as text; following a
      relationship moves the single selection and Back retraces a sequence in reverse order.

## 4. Accessibility, presentation and scale for this slice's surfaces

- [x] 4.1 Groups and disclosures placed in the heading outline without skipping a level; expansion and
      relationship following fully keyboard-operable with visible focus.
- [x] 4.2 Relationship type and direction determinable with colour removed; no needed information
      hover-only; no non-essential animation under a reduced-motion preference.
- [x] 4.3 Every text-and-background pair introduced here meets WCAG 2.1 AA.
- [x] 4.4 Groups adapt on a narrow viewport without horizontal page scrolling.
- [x] 4.5 Re-measure artifact-selection latency for the highest-degree artifact at every representative
      scale against the budget agreed in SLI-SNAPSHOT-003; confirm no regression and record the figures.
- [x] 4.6 Browser pass: screenshots of the grouped relationships at desktop and narrow viewports,
      collapsed and expanded, for the current model.

## 5. Contract preservation and evidence

- [x] 5.1 Confirm one self-contained file, no external resources, nothing persisted, nothing mutable.
- [x] 5.2 Confirm regeneration is byte-identical.
- [x] 5.3 Full test suite, lint, typecheck and format check.
- [x] 5.4 Record coverage evidence for this slice's requirements in `product-coverage.yaml`.
