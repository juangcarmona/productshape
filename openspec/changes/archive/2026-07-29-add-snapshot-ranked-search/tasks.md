# Tasks: add-snapshot-ranked-search

Product input: handoff `HOF-GITHUB-33`, slice `SLI-SNAPSHOT-005`, work item `github:juangcarmona/productshape/issues/33`.

## 1. Ranking

- [x] 1.1 Classify each match into the five tiers FR-SNAPSHOT-004 fixes: exact identifier, identifier prefix, exact or prefix title, title substring, body content. Fold kind matches into the title tier.
- [x] 1.2 Score every artifact, then sort by tier and then identifier, so ordering is total.
- [x] 1.3 Apply any display cap after scoring, never during it.
- [x] 1.4 Unit tests: an exact identifier ranks first; identifier prefixes outrank titles; titles outrank body-only matches; the `product` query returns every title match above the body matches; ordering is identical across two builds.

## 2. Result presentation

- [x] 2.1 Show identifier, title and kind for every result.
- [x] 2.2 Show a snippet for body-tier results only, windowed around the match from the plain-text index, inserted as text.
- [x] 2.3 State the total match count whenever display is limited.
- [x] 2.4 Unit tests: results carry identity and kind; a body match shows a snippet containing the phrase; markup-like authored text in a snippet is displayed as text; truncation reports the total and omits only lower-ranked matches.

## 3. Interaction

- [x] 3.1 Arrow keys move an active-result marker, Enter follows it, Escape clears; the field keeps focus.
- [x] 3.2 Report the active result with `aria-activedescendant`, and keep results as ordinary links.
- [x] 3.3 Selecting a result moves the page's single selected artifact through the router.
- [x] 3.4 Clearing the query restores browsing without discarding the selected artifact.
- [x] 3.5 Explicit no-results state naming the query.
- [x] 3.6 Unit tests: keyboard traversal and commit; `aria-activedescendant` tracks the marker; selection converges on the router; clearing preserves the selection; no-results names the query.

## 4. Accessibility, presentation and scale for this slice's surfaces

- [x] 4.1 Field and result list placed in the heading and landmark structure without skipping a level; full keyboard operation with visible focus.
- [x] 4.2 Nothing in a result carried by colour alone; no hover-only information; no non-essential animation under a reduced-motion preference.
- [x] 4.3 Every text-and-background pair introduced here meets WCAG 2.1 AA, including snippet emphasis.
- [x] 4.4 Results usable on a narrow viewport without horizontal page scrolling.
- [x] 4.5 Measure search latency on the reference environment across the three representative models, for a query matching one artifact, roughly a tenth of the model, and every artifact; record the distribution and set the search-latency budget from it.
- [x] 4.6 Confirm artifact-selection latency has not regressed against the SLI-SNAPSHOT-003 budget.
- [x] 4.7 Browser pass: screenshots of ranked results, a body-match snippet, the keyboard-active state and the no-results state, at desktop and narrow viewports.

## 5. Contract preservation and evidence

- [x] 5.1 Confirm one self-contained file, no external resources, nothing persisted, nothing mutable.
- [x] 5.2 Confirm regeneration is byte-identical.
- [x] 5.3 Full test suite, lint, typecheck and format check.
- [x] 5.4 Record coverage evidence in `product-coverage.yaml`.
