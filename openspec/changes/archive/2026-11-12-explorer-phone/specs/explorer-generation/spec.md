<!-- pdac-scope: cited -->

## ADDED Requirements

### Requirement: Maps and the Reader adapt to a phone

On a viewport no wider than 40rem, every map SHALL open with its artifact labels drawn at full size, laid out for the width.

- The Overview map SHALL stack its kind regions in one column in the Columns order, fitted to the width and anchored at the top.
- The Columns view SHALL open with one column across the width (the selected artifact's column, otherwise the first) and reach the others by panning sideways.
- The Focus view SHALL draw the focus at the top and its kind groups stacked beneath it in the Columns order, with exactly one line joining each drawn neighbour to the focus. It SHALL draw no background marks.
- The fit control SHALL fit the width.

Every map interaction (pan, pinch, controls, keys, lighting, the summary card) SHALL be unchanged.

In the Reader, the back, previous and next controls SHALL stay within reach while the artifact scrolls. A horizontal swipe across the artifact SHALL step to the next or previous artifact exactly as those controls do, and a vertical scroll SHALL NOT.

<!-- pdac:cite id="FR-EXPLORER-PROJECTIONS" digest="sha256:3d907ff7af20caec11d8a18f38e0d03c113697de32fe78b89f74f336bb6e0582" -->
<!-- pdac:cite id="FR-EXPLORER-TOPOLOGY" digest="sha256:015932a604e9ca3a3e74a09a4e48b97c9244a1fe7c128847e8d3abc081498996" -->
<!-- pdac:cite id="FR-EXPLORER-READER" digest="sha256:32c1e6cfffebf8fefb15994e1b61b25f877f1ad5dbf19f569b25c1e31c8c1e41" -->
<!-- pdac:cite id="QR-PRESENTATION" digest="sha256:c1ad61f92d09b08c0f85c257f3735c4f6176268672a7cca6e8e56c3fef1ae3e9" -->

#### Scenario: The Focus view stacks on a phone

- **WHEN** the Focus view opens on an artifact at a phone width
- **THEN** the focus is drawn above every group, the groups follow the Columns order downward, each drawn neighbour has exactly one line to the focus, and no background mark is drawn

#### Scenario: The Overview stacks on a phone

- **WHEN** the Overview map opens at a phone width
- **THEN** each kind region is at most two chips wide, the regions sit one under another, and the chips open at full size

#### Scenario: Swipe steps through the list

- **WHEN** the reader swipes horizontally across an artifact in the Reader at a phone width
- **THEN** the next or previous artifact of the current list opens, as the buttons would, and a vertical scroll changes nothing

#### Scenario: Wider viewports are unchanged

- **WHEN** the page opens wider than 40rem
- **THEN** every map and the Reader behave as before
