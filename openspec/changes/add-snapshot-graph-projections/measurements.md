# Measurements: add-snapshot-graph-projections

Evidence for `QR-SCALABILITY-001` as `SLI-SNAPSHOT-006` scopes it. Reproduce with
`pnpm measure:snapshot --scales 1,5,10` and `pnpm shots:snapshot`. Reference environment as recorded in
`SLI-SNAPSHOT-003`, plus headless Microsoft Edge (Chromium) for the visual evidence.

## Focused neighbourhood — bounded by types, not by degree

Elapsed time from the address naming an anchor to the projection being in the document, for the
highest-degree artifact and an isolated one. 10 timed iterations after 3 discarded warm-up rounds.

| Model        | Busiest anchor          | Its degree | Its satellites | p50     | p95     |
| ------------ | ----------------------- | ---------- | -------------- | ------- | ------- |
| current (73) | `BC-PRODUCT-DEFINITION` | 27         | 5              | 1.7 ms  | 2.8 ms  |
| 5× (365)     | `BC-C-001`              | 91         | 5              | 8.4 ms  | 12.0 ms |
| 10× (730)    | `BC-C-001`              | 171        | 5              | 12.6 ms | 18.3 ms |

The satellite count stays at five while degree grows from 27 to 171, which is the whole point of
orbiting groups rather than artifacts: the projection's size tracks how many relationship _types_ an
artifact has. A cloud of individual artifacts would be drawing 171 nodes and 171 spokes at the largest
scale — the circle this change deleted, in a different arrangement.

### Budget

**The focused neighbourhood renders within 100 ms at p95 on the reference environment.**

Derived from the figures above: 18.3 ms is the worst observed case, at the largest model on its busiest
artifact, leaving substantial headroom for browser layout and paint. The same 100 ms as artifact
selection and search, deliberately — all three are direct responses to a click or a keystroke.

## Layered model map

| Model        | Render  | Artifacts collapsed | Relationships drawn individually | Aggregate connectors |
| ------------ | ------- | ------------------- | -------------------------------- | -------------------- |
| current (73) | 7.6 ms  | 0 of 73             | 196 of 196                       | 0                    |
| 5× (365)     | 13.2 ms | 295 of 365          | 40 of 1,645                      | 130                  |
| 10× (730)    | 12.2 ms | 710 of 730          | 0 of 3,290                       | 60                   |

Two findings the measurement produced, both fixed rather than reported:

**The map collapsed a model that did not need collapsing.** A fixed per-kind threshold hid use cases
and functional requirements at 73 artifacts, drawing 27 of 196 relationships. `FR-SNAPSHOT-005`'s
wording is scale-conditional — not every node and edge "for a large model" — so the threshold became a
budget on the total rendered, collapsing the largest kinds first. The current model now draws in full;
the larger ones still hold back.

**At scale the map went silent.** With the biggest kinds collapsed, 10× drew **none** of its 3,290
relationships, because both ends of nearly every edge were hidden. Honest, and useless. Edges touching
a collapsed kind are now routed to that kind's cell and merged into a counted connector, so the map
shows 60 connectors representing all 3,290 relationships instead of an empty diagram. Nothing is
omitted at any scale; what is not drawn individually is drawn in aggregate and counted, and the summary
line states the split.

## Other interactions — no regression

|                        | current | 5×      | 10×     | Budget |
| ---------------------- | ------- | ------- | ------- | ------ |
| Artifact selection p95 | 10.7 ms | 12.8 ms | 17.4 ms | 100 ms |
| Search p95 (warm)      | 2.4 ms  | 2.4 ms  | 2.8 ms  | 100 ms |
| First-ever search      | 6.6 ms  | 11.5 ms | 16.5 ms | 100 ms |

## Generated file and opening document

| Model   | File        | Opening document | Bytes per authored byte |
| ------- | ----------- | ---------------- | ----------------------- |
| current | 276,734 B   | 9,414 B (3%)     | 1.890                   |
| 5×      | 1,259,761 B | 9,660 B (1%)     | 1.800                   |
| 10×     | 2,446,705 B | 10,493 B (0%)    | 1.754                   |

The opening document still grows **1.11×** across a tenfold larger model. The file grew 20,787 bytes
against slice 3 — two projection renderers, minus the circular one they replace.

## Visual evidence

26 screenshots in `docs/assets/snapshot/`; six are new: the layered map at desktop and narrow, the
focused neighbourhood for a typical artifact, for the hardest artifact, with a group opened, and for an
isolated artifact. `manifest.json` records each route, viewport and caption.

Two layout defects the screenshots caught, both fixed:

- **Half the canvas was empty** for a one-directional artifact. Every bounded context and most actors
  are purely incoming, so reserving a half for outgoing left the projection looking broken. The canvas
  now sizes itself to the populated halves, and direction stays positional either way.
- **A populous cell spilled past its border.** 21 functional requirements overflowed a 300-px cell.
  Members now wrap into rows, and a kind needing more than three rows collapses regardless of budget.
