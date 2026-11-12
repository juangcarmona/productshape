<!-- pdac-scope: cited -->

## Why

Product Change **CHG-SNAPSHOT-V2** has been approved and applied to the baseline. It makes a map of the whole model the Product Explorer's primary experience, following a spike that readers found far clearer than the current snapshot (juangcarmona/productshape#312):

- an Overview map with every artifact as a chip, by kind and bounded context;
- a Focus view that replaces the Focused Topology;
- a Columns view with one column per kind;
- a neon highlight of an artifact's neighbourhood in both appearances;
- a business lens that reads a use case in business language.

The generator still implements the previous definition. This change delivers the new one in `buildSnapshotHtml`.

<!-- pdac:cite id="FR-SNAPSHOT-PROJECTIONS" digest="sha256:7ab7050a644bbe3f1fd7dc38bda0c2037d5ae01348dad95fcf67bea914bfe137" -->
<!-- pdac:cite id="TERM-PRODUCT-EXPLORER" digest="sha256:c1d1e70f923702a1863ad63d70127ea844a531aa6d153e5750989d4a9b02b60f" -->

## What Changes

- **Overview.** A compact orientation strip (identity, totals, revision, read-only statement, search), then the Overview map drawn from the embedded data, then the existing composition, entry points, unconnected group, kind grid and aggregate table below it.
- **Focus view** (`#/focus/ID`). The selection at the centre, neighbours grouped by kind on fixed sides, relationship labels with direction, `+N` counts, collapsible groups with disclosure in the address (`x`), the rest of the model as a seeded background, a breadcrumb.
- **Columns view** (`#/columns[/ID]`). One column per kind in the stated order, every relationship drawn, click to select, double-click to focus.
- **Map interaction.** Pan by drag, zoom by wheel and pinch, zoom/fit controls and `+ - 0` keys, arrow-key movement with one tab stop per map, hover and focus lighting, a summary card. The camera is never addressed.
- **Business lens** (`l=b`). A header toggle and the `l` key. The card quotes Goal, Trigger and rule statements, lists actors, journeys, behaviours (with given/when/then), requirements, quality requirements and constraints by title, and states what a change would put in question.
- **Reader.** The Focused Topology pane and its splitter are removed. The Reader gains a Focus action and, with the lens on, the business card.
- **Data.** Each artifact carries `q`, its one-hop impact (`putInQuestionBy`). Each structured behaviour carries `gwt`, its given/when/then as lines.
- **Addressing.** `#/overview/ID`, `#/focus/ID`, `#/columns/ID` join `#/artifacts/ID`. Every view tab carries the selection. `#/graph/focus/ID` resolves to the Focus view in place.
- **Harnesses.** `measure:snapshot` measures the map views. `shots:snapshot` captures them in both appearances.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `snapshot-generation`:
  - three map views (added);
  - the Overview map, the Focus view and the Columns view (added);
  - the business lens (added);
  - orientation, addressing, accessibility wording, scalability, presentation and master area (modified);
  - the two-projection limit and the focused neighbourhood (removed).

## Impact

`src/packages/core/src/snapshot.ts` and its tests; `src/scripts/measure-snapshot.mts`; `src/scripts/screenshot-snapshot.mts`; `docs/assets/snapshot/`. There is no change to the CLI surface, file format or dependencies. A published `@prodshape/core` and `@prodshape/cli` change: changeset added.

<!-- pdac:cite id="FR-SNAPSHOT-TOPOLOGY" digest="sha256:9680d19b034f9502cac05ca24f027c8d31bb4bd0ee7a91ab773915e89becd574" -->
<!-- pdac:cite id="FR-SNAPSHOT-BUSINESS-LENS" digest="sha256:17d95ec61b7315ddcaa84ff9bffb1c1fccc7d360501ab2d8d49f7cbd83b29fd3" -->
