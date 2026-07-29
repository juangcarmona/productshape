# Measurements: add-snapshot-explorer-foundation

Evidence for `QR-SCALABILITY-001` as `SLI-SNAPSHOT-003` scopes it. Reproduce with:

```
pnpm measure:snapshot --scales 1,5,10 --out <path>
```

## Reference environment

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| Platform        | Linux 6.6.87.2-microsoft-standard-WSL2 (x64) |
| CPU             | Intel Core Ultra 7 155H, 22 logical cores    |
| Memory          | 15.4 GiB                                     |
| Node            | v24.14.0                                     |
| DOM             | jsdom 30.0.0                                 |
| Browser (paint) | not yet recorded — see Outstanding below     |

## Representative models

| Model                 | Artifacts | Relationships | Max degree | Isolated |
| --------------------- | --------- | ------------- | ---------- | -------- |
| current product model | 73        | 196           | 27         | 3        |
| synthetic 5×          | 365       | 1,645         | 91         | 15       |
| synthetic 10×         | 730       | 3,290         | 171        | 30       |

The synthetic models carry dense relationships, high-degree hubs, isolated artifacts, and one
artifact with a long title and a long body.

## Opening document — bounded, as required

| Model   | Before (markup at open) | After    | Artifact nodes/edges at open |
| ------- | ----------------------- | -------- | ---------------------------- |
| current | 300,371 B (65% of file) | 8,978 B  | 0 / 0 (was 73 / 196)         |
| 5×      | 1,587,120 B (69%)       | 9,224 B  | 0 / 0 (was 365 / 1,645)      |
| 10×     | 3,169,405 B (69%)       | 10,057 B | 0 / 0 (was 730 / 3,290)      |

**Growth across a tenfold increase in artifacts: 1.12× (target < 2.00×).** The pre-change baseline
grew 10.55×, which is the failure this slice corrects. The opening document is now bounded by the
artifact kinds present and the kind-level aggregate over them, not by the artifact count.

## Generated file size and generation time

| Model   | File before | File after  | Bytes per authored byte | Generation (ms, 3 runs) |
| ------- | ----------- | ----------- | ----------------------- | ----------------------- |
| current | 459,704 B   | 246,167 B   | 3.164 → 1.695           | 6.2–15.8                |
| 5×      | 2,314,262 B | 1,229,194 B | 3.313 → 1.760           | 27.2–33.3               |
| 10×     | 4,613,464 B | 2,416,138 B | 3.309 → 1.733           | 49.1–55.7               |

Size per authored byte does not increase with model size (1.695 / 1.760 / 1.733) and is roughly
halved against the baseline. Generation time per artifact does not increase with model size, and the
largest representative model generates in well under the five-second target — measuring
`buildSnapshotHtml` alone; the full CLI run including validation remains sub-second.

## Artifact-selection latency

Elapsed time from the address changing to the selected artifact's detail being present in the
document, for the hardest artifacts in each model (longest body, and highest degree), 20 timed
iterations after 5 discarded warm-up rounds.

| Model   | Hardest artifacts                          | p50      | p95      | max      |
| ------- | ------------------------------------------ | -------- | -------- | -------- |
| current | FR-DISTRIBUTION-001, BC-PRODUCT-DEFINITION | 4.44 ms  | 7.48 ms  | 10.03 ms |
| 5×      | ACT-A-001, BC-C-001                        | 12.64 ms | 20.50 ms | 21.69 ms |
| 10×     | ACT-A-001, BC-C-001                        | 22.01 ms | 29.21 ms | 36.11 ms |

Selection cost tracks the degree of the artifact being displayed rather than the size of the model:
the list is no longer rebuilt when the selection moves, only the current marker, so what remains is
the cost of rendering the selected artifact's own relationships. `BC-C-001` at 10× has 171 of them.
`SLI-SNAPSHOT-004` groups and collapses high-degree neighbours, which is expected to reduce this
further rather than let it grow.

### Budget

**Artifact selection completes within 100 ms at p95 on the reference environment.**

Derived from the figures above: observed DOM-construction p95 is 7–29 ms across a tenfold range of
model size, leaving roughly 3× headroom for the browser layout and paint that jsdom does not perform.
The budget is set from measurement rather than assumed, and it is the figure a regression is checked
against.

## Outstanding

jsdom implements the DOM but not layout or paint, so every interaction figure here is a lower bound
on what a reader experiences. Confirming the budget in a real browser opened over `file://` on this
same environment — and recording the browser version alongside — is the one measurement this
environment could not produce. The margin chosen above exists precisely because that confirmation is
still pending; if the browser pass shows otherwise, the budget is a finding for the product owner,
not a number to quietly raise.
