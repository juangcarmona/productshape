<!-- pdac-scope: cited -->

## Why

Product Change **CHG-EXPLORER-PHONE** has been approved and applied. On a phone, the Product Explorer's maps shrink the whole drawing into the screen and become unreadable. The Focus view is wider than a phone at any legible size. In the Reader, stepping through a list means scrolling back to the top of each artifact. The generator does not yet implement the phone behaviour the requirements now state.

<!-- pdac:cite id="FR-EXPLORER-PROJECTIONS" digest="sha256:3d907ff7af20caec11d8a18f38e0d03c113697de32fe78b89f74f336bb6e0582" -->
<!-- pdac:cite id="FR-EXPLORER-TOPOLOGY" digest="sha256:015932a604e9ca3a3e74a09a4e48b97c9244a1fe7c128847e8d3abc081498996" -->
<!-- pdac:cite id="FR-EXPLORER-READER" digest="sha256:32c1e6cfffebf8fefb15994e1b61b25f877f1ad5dbf19f569b25c1e31c8c1e41" -->
<!-- pdac:cite id="QR-PRESENTATION" digest="sha256:c1ad61f92d09b08c0f85c257f3735c4f6176268672a7cca6e8e56c3fef1ae3e9" -->

## What Changes

A phone is a viewport no wider than 40rem.

- **Overview map on a phone.**
  - Each kind region is at most two chips wide.
  - The regions stack in one column in the Columns order.
  - The camera fits the width at full label size and starts at the top.
- **Columns view on a phone.** The camera opens with one column across the width: the selected artifact's column, otherwise the first. The other columns are reached by panning sideways.
- **Focus view on a phone.**
  - The focus is at the top, and its kind groups are stacked beneath it in the Columns order.
  - Each neighbour is joined to the focus by a line along a spine at the left.
  - No background marks are drawn.
  - The camera fits the width and starts at the top.
- **Fit control on a phone.** It fits the width.
- **Reader on a phone.**
  - The bar with back, previous and next sticks to the top of the detail while the reader scrolls.
  - A horizontal swipe across the detail steps to the next or previous artifact.
- **Viewport changes.** Crossing the 40rem boundary redraws the maps for the new viewport. Layouts stay deterministic for a given viewport.
- **Evidence.** Phone screenshots of each map and of the Reader.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explorer-generation`: maps and the Reader adapt to a phone (added).

## Impact

- **Code:** `src/packages/core/src/explorer.ts` (the page's styles and script) and its tests.
- **Evidence:** `src/scripts/screenshot-explorer.mts`.
- **Unchanged:**
  - desktop and narrow (tablet) layouts;
  - addresses;
  - the embedded data;
  - the CLI.
