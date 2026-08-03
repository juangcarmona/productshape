# Proposal: add-snapshot-ranked-search

## Why

Search is how a reader who already knows what they want avoids the rest of the model, which makes it the most important single control on a page built around progressive disclosure. The search carried forward from earlier slices cannot serve that role: it matches substrings without ranking, walks the artifact list in document order, and stops at 25 hits.

Measured against this repository's own model, querying `product` matches 73 artifacts, shows 25, hides 48 without saying so, and returns none of the eight artifacts whose **titles** begin with "Product" — including the term `TERM-PRODUCT-SNAPSHOT` — because body-only matches on artifacts that happen to sort earlier consume the entire budget. A reader searching for a concept they heard in a meeting is systematically shown the wrong artifacts and told nothing about it.

Product Change **CHG-SNAPSHOT-002**'s third delivery slice, **SLI-SNAPSHOT-005** (work item `github:juangcarmona/productshape#33`, handoff `HOF-GITHUB-33`), replaces it with ranked search.

## What Changes

- Results are **ranked**: exact identifier, then identifier prefix, then exact or prefix title, then title substring, then body match. A query equal to an artifact's identifier puts it first.
- Search matches **artifact kinds** as well as identifiers, titles and bodies.
- Each result identifies its artifact by **identifier, title and kind**, and a body match shows a **snippet** of the matching content, escaped.
- **Truncation is never silent**: when the page limits what it displays it states how many matches exist in total, and never shows a lower-ranked match in place of a higher-ranked one.
- Full **keyboard operation**: reach the field, move through results, select, clear. Selecting a result moves the page's single selected artifact through the same navigation mechanism.
- **Clearing** the query returns to browsing without discarding the selected artifact, and a query matching nothing produces an explicit **no-results** state naming the query.
- Identical queries against identical model content produce **identical result order**.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `snapshot-generation`: the existing "Offline client-side search" requirement gains ranking, kind matching, result identity, snippets, honest truncation, keyboard operation, clearing behaviour, an explicit no-results state and deterministic ordering.

## Impact

- **`packages/core`**: the embedded application's search replaces substring-scan-and-cap with a scored pass that classifies every match by rank tier, sorts by tier then identifier, and reports the full match count. The body-text index it already builds lazily is reused; snippets come from the same text.
- **Determinism**: ranking ties break on identifier, which is unique and stable, so ordering is total.
- **Performance**: scoring visits every artifact instead of stopping at the cap, so this is the one change in the slice that could cost time. Measured against the representative models, and the search-latency budget is set from those figures.
- **Verification**: the ranking order, the `product` regression that motivated the slice, kind matching, snippet escaping, truncation reporting, keyboard operation, clearing, no-results, and determinism across two builds.
