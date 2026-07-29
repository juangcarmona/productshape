# Measurements: add-snapshot-ranked-search

Evidence for `QR-SCALABILITY-001` as `SLI-SNAPSHOT-005` scopes it. Reproduce with
`pnpm measure:snapshot --scales 1,5,10` and `pnpm shots:snapshot`.

Reference environment as recorded in `SLI-SNAPSHOT-003`, plus headless Microsoft Edge (Chromium) for
the visual evidence.

## The ranking regression this slice existed to fix

Querying `product` against this repository's own model, before and after:

|                                   | Before                           | After                                 |
| --------------------------------- | -------------------------------- | ------------------------------------- |
| Matches found                     | 73                               | 73                                    |
| Results shown                     | 25                               | 25                                    |
| Total stated to the reader        | **nothing** — 48 hidden silently | **"73 matches · showing the top 25"** |
| Title-matching artifacts surfaced | **0 of 8**                       | **8 of 8**                            |

The eight are `ACT-PRODUCT-ENGINEER`, `ACT-PRODUCT-EXPLORER`, `BC-PRODUCT-DEFINITION`,
`TERM-PRODUCT-ARTIFACT`, `TERM-PRODUCT-CHANGE`, `TERM-PRODUCT-CONTEXT`, `TERM-PRODUCT-GRAPH`,
`TERM-PRODUCT-SNAPSHOT`. Every one was previously displaced by body-only matches that happened to sort
earlier.

## A defect the measurement found

The first figures looked excellent: warm search p95 of 3.4 / 2.5 / 3.6 ms across the three models,
essentially flat. That figure was misleading, because it excluded the query a reader actually notices
first — the one that builds the body-text index.

Measured cold, in a fresh document:

| Model        | First query, before | First query, after |          |
| ------------ | ------------------- | ------------------ | -------- |
| current (73) | 75.33 ms            | **6.68 ms**        | −91%     |
| 5× (365)     | 493.74 ms           | **10.25 ms**       | −98%     |
| 10× (730)    | **849.51 ms**       | **15.52 ms**       | **−98%** |

849 ms is a visibly blocked keystroke, and it grew linearly with the model, so it would only get worse.
The cause was building the index by assigning each rendered body to a probe element and reading its
`textContent` — a full HTML parse of the entire model before a single result could appear.

The generator emits a small, known tag vocabulary and escapes exactly four entities, so the index now
strips tags textually, which is both exact and far cheaper. It is also warmed during idle time after
load, so in practice the first keystroke usually finds it already built. Tests guard the exactness:
content inside headings, bold, inline code, list items and fenced code all remain findable, escaped
entities are decoded, and adjacent words are not glued together when a tag between them is removed.

The lesson is recorded rather than quietly fixed: a warm p95 is not the figure a reader feels.

## Warm search latency

Queries matching one artifact, roughly a tenth of the model, and every artifact. 10 timed iterations
after 3 discarded warm-up rounds.

| Model        | p50     | p95     | max      |
| ------------ | ------- | ------- | -------- |
| current (73) | 1.44 ms | 2.84 ms | 4.62 ms  |
| 5× (365)     | 4.05 ms | 7.08 ms | 8.11 ms  |
| 10× (730)    | 5.31 ms | 7.94 ms | 10.02 ms |

Scoring now visits every artifact rather than stopping at the display cap — the change that makes
ranking possible at all — and it still costs single-digit milliseconds at ten times the model size.

### Budget

**Search results appear within 100 ms at p95 on the reference environment, including the first query
of a session.**

Derived from the figures above: 15.5 ms is the worst observed case, cold, at the largest model, leaving
substantial headroom for browser layout and paint. The same 100 ms budget as artifact selection, which
is deliberate — both are direct responses to typing or clicking, and a reader has no reason to expect
one to be slower than the other.

## Artifact-selection latency — no regression

| Model   | p95 (slice 4) | p95 (now) |
| ------- | ------------- | --------- |
| current | 7.93 ms       | 7.99 ms   |
| 5×      | 18.00 ms      | 16.64 ms  |
| 10×     | 24.00 ms      | 24.18 ms  |

Within noise of the slice-4 figures and far inside the 100 ms budget.

## Generated file and opening document

| Model   | File        | Opening document | Bytes per authored byte |
| ------- | ----------- | ---------------- | ----------------------- |
| current | 255,947 B   | 9,193 B (4%)     | 1.762                   |
| 5×      | 1,238,974 B | 9,439 B (1%)     | 1.774                   |
| 10×     | 2,425,918 B | 10,272 B (0%)    | 1.740                   |

The opening document still grows **1.12×** across a tenfold larger model. The file grew 5,306 bytes
against slice 4 — the ranking code, the result styles and the status line.

## Visual evidence

16 screenshots in `docs/assets/snapshot/`; five are new for this slice: ranked results with the match
count, a body-match snippet, the keyboard-active result, the no-results state, and results at a narrow
viewport. `manifest.json` records each route, viewport and caption.
