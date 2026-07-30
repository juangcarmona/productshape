# Measurements: add-product-landscape

Evidence for `QR-SCALABILITY-001` as `SLI-SNAPSHOT-007` scopes it. Reproduce with
`pnpm measure:snapshot --scales 1,5,10` and `pnpm shots:snapshot`. The machine-readable figures are in
`measurements.json` beside this file.

## Reference environment

| Field    | Value                                        |
| -------- | -------------------------------------------- |
| Platform | Linux 6.6.87.2-microsoft-standard-WSL2 (x64) |
| CPU      | Intel Core Ultra 7 155H, 22 logical cores    |
| Memory   | 15.4 GiB                                     |
| Node     | v24.14.0                                     |
| DOM      | jsdom 30.0.0                                 |
| Browser  | Microsoft Edge (Chromium), headless          |

## The SLI-SNAPSHOT-007 landscape integrity properties

Five properties, at all three reference scales. Each is measured structurally, not judged by eye. The
count of artifacts aggregated away is not one of the five; it is reported separately below, because it
is a statement about what the landscape does rather than about whether it holds together.

| Property                       | 81 artifacts | 365 artifacts | 730 artifacts |
| ------------------------------ | ------------ | ------------- | ------------- |
| Deterministic stable placement | **pass**     | **pass**      | **pass**      |
| Individual reachability        | **pass**     | **pass**      | **pass**      |
| Individual selection           | **81 / 81**  | **365 / 365** | **730 / 730** |
| No clipping                    | **pass**     | **pass**      | **pass**      |
| No node overlap                | **pass**     | **pass**      | **pass**      |

Reported separately:

| Reported separately       | 81    | 365   | 730   |
| ------------------------- | ----- | ----- | ----- |
| Artifacts aggregated away | **0** | **0** | **0** |

How each is established:

- **Deterministic stable placement** — every node's rectangle is recorded, the camera is then panned
  twice and zoomed twice by keyboard, and every position is compared again. The landscape is also
  rendered a second time from identical content and compared. Positions must be identical in all
  three readings.
- **Individual reachability** — the set of node identifiers must equal the set of compiled artifact
  identifiers exactly, and every node must be focusable.
- **Individual selection** — every artifact is activated in turn by keyboard and the resulting address
  checked against that artifact's own address. Exhaustive rather than sampled: 730 activations are
  cheap, and sampling would leave the interesting failures unfound.
- **No clipping** — every node rectangle is compared against the fitted viewBox bounds.
- **No node overlap** — every node rectangle is compared against every other. At 730 nodes that is
  265,585 pairs, checked in full.

These five are this slice's projection of the five `QR-SCALABILITY-001` states at the requirement
level. The requirement pairs selection with focus; this slice verifies **selection only** — that
activating a node reaches the selected artifact's address. See "Not verified here" below.

## Whole-landscape rendering against its canonical budget

`QR-SCALABILITY-001` sets the budget: **whole-landscape rendering MUST complete within 250 ms at the
95th percentile** on this environment, at each reference scale. The budget is canonical product
definition; this file supplies the evidence, not the threshold.

| Model         | Artifacts | Nodes drawn | p50     | **p95**      | Slowest sample | Budget | Verdict  |
| ------------- | --------- | ----------- | ------- | ------------ | -------------- | ------ | -------- |
| current       | 81        | 81          | 10.1 ms | **20.9 ms**  | 28.1 ms        | 250 ms | **pass** |
| synthetic 5×  | 365       | 365         | 42.7 ms | **52.5 ms**  | 71.0 ms        | 250 ms | **pass** |
| synthetic 10× | 730       | 730         | 83.6 ms | **121.0 ms** | 125.2 ms       | 250 ms | **pass** |

### Sampling protocol

- **Measured interval.** From dispatching the navigation that requests the landscape until the
  landscape is ready for interaction — every node placed and activatable. Rendering is synchronous, so
  the interval closes when the dispatch returns.
- **Samples.** 43 entries per scale; the first **3 are discarded** as warm-up and the remaining **40
  are retained**. Each entry navigates to the artifact list first, so every sample builds the whole
  canvas from nothing rather than re-showing an already-populated host.
- **Warm-up rationale.** The discarded samples carry first-call JIT and the lazily built artifact
  index — costs a reader pays once per document, not once per view change.
- **Estimator.** The sample at index `floor(n × 0.95)` of the 40 sorted retained samples, so p95 is the
  39th of 40 and is a distinct order statistic from the maximum. At 20 samples the two would coincide,
  which is why 40 are taken.
- **Reporting.** p50, p95 and the slowest retained sample are all recorded. The slowest sample is
  reported so the percentile is not the only figure standing behind the verdict.
- **Instrument limit.** Measured in jsdom, which builds the DOM but performs no layout or paint. These
  figures are therefore a **lower bound** on what a reader experiences. The 250 ms budget is set well
  above the observed p95 partly to cover the browser layout and paint of roughly 2,900 SVG elements at
  the largest scale, which this instrument does not exercise.

## Other interactions — regression check only

These interactions are not introduced by this slice; the figures confirm the landscape did not degrade
them. The 100 ms figure is the measurement harness's working budget, and per `CHG-SNAPSHOT-002` it is a
provisional technical hypothesis, not a canonical threshold.

|                        | 81     | 365     | 730     | Harness budget |
| ---------------------- | ------ | ------- | ------- | -------------- |
| Artifact selection p95 | 9.4 ms | 16.6 ms | 24.3 ms | 100 ms         |
| Search p95 (warm)      | 2.7 ms | 7.5 ms  | 5.5 ms  | 100 ms         |

## Generated file and opening document

| Model   | File        | Opening document | Bytes per authored byte | Generation   |
| ------- | ----------- | ---------------- | ----------------------- | ------------ |
| current | 369,131 B   | 9,532 B (3%)     | 1.731                   | 6.8–15.5 ms  |
| 5×      | 1,265,905 B | 9,777 B (1%)     | 1.812                   | 28.1–32.7 ms |
| 10×     | 2,452,849 B | 10,610 B (0%)    | 1.760                   | 48.3–67.2 ms |

The opening document grows **1.11×** across a ninefold increase in artifacts, and size per authored
byte does not increase with model size. Regeneration from identical model content remains
byte-identical.

## Visual evidence

25 screenshots in `docs/assets/snapshot/`; `manifest.json` records each route, viewport, source model
and caption. Six cover the landscape:

| Screenshot                    | Shows                                                          | Model         |
| ----------------------------- | -------------------------------------------------------------- | ------------- |
| `09-landscape-fitted.png`     | The complete landscape at 81 artifacts, four bands with counts | product       |
| `22-landscape-readable.png`   | Readable-detail zoom: title-first nodes, identifier beneath    | product       |
| `26-landscape-730.png`        | The complete landscape at 730 artifacts, whole canvas in frame | synthetic 10× |
| `24-landscape-narrow.png`     | Narrow viewport (430 px)                                       | product       |
| `23-landscape-focus-ring.png` | Keyboard focus ring on a node                                  | product       |
| `25-landscape-no-colour.png`  | Colour removed: band and kind still determinable               | product       |

The 730-artifact capture is framed at 1440×3200 because the canvas grows with the model instead of
shrinking to fit; a shorter frame would crop the last band and make "the complete landscape" a false
caption. Its in-page summary line reads `730 of 730 artifacts individually represented · none
aggregated, none hidden`, which is the aggregated-away figure visible in the product rather than only
in a table.

The 730-artifact page is generated from the same synthetic-model definition the measurement harness
uses (`scripts/lib/synthetic-model.mts`), so the picture and the figures describe one landscape rather
than two that drifted apart.

## Not verified here

- **Focused-state behaviour and focus-transition performance.** Both are deferred to
  `SLI-SNAPSHOT-008`, where the focused state first exists. Nothing in this file's evidence should be
  read as verifying either. The `focusMs` figures the harness still records belong to the pre-existing
  focused projection and are not slice-7 verification, which is why they are absent from the
  regression table above.
- **Simultaneous legibility of every title in a viewport fitted to the whole product.** At 730
  artifacts no rendering could satisfy it, the approved change says so explicitly, and treating it as
  an acceptance condition would make the requirement unsatisfiable. Legibility is delivered by
  panning, zooming and fitting, verified as working by pointer and by keyboard.
- **Band scoping.** `SLI-SNAPSHOT-010`.
