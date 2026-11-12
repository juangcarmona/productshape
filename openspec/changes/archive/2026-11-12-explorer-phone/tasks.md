<!-- pdac-scope: cited -->

## 1. Product Change

- [x] 1.1 Author CHG-EXPLORER-PHONE modifying FR-EXPLORER-PROJECTIONS, FR-EXPLORER-TOPOLOGY, FR-EXPLORER-READER and QR-PRESENTATION. Validate the overlay, record the approval and apply it.

<!-- pdac:cite id="QR-PRESENTATION" digest="sha256:c1ad61f92d09b08c0f85c257f3735c4f6176268672a7cca6e8e56c3fef1ae3e9" -->

## 2. Maps

- [x] 2.1 Add `isPhone()` and phone-aware build keys, and rebuild the active map when the viewport crosses 40rem.
- [x] 2.2 Overview: stack the kind regions on a phone, and fit the width from the top at full size.
- [x] 2.3 Focus: on a phone, a stacked column with spine edges and no background marks.
- [x] 2.4 Columns: open one column across the width on a phone, at the selection's column.
- [x] 2.5 Make the fit control fit the width on a phone.

<!-- pdac:cite id="FR-EXPLORER-PROJECTIONS" digest="sha256:3d907ff7af20caec11d8a18f38e0d03c113697de32fe78b89f74f336bb6e0582" -->
<!-- pdac:cite id="FR-EXPLORER-TOPOLOGY" digest="sha256:8509d81d58828ef42f862d8b56403db999bdf66e65fc1aa1288853c6a0a5a66c" -->

## 3. Reader

- [x] 3.1 Stick the Reader bar to the top of the detail on a phone.
- [x] 3.2 Step to the next or previous artifact on a horizontal swipe, ignoring vertical scrolls and scrollable content.

<!-- pdac:cite id="FR-EXPLORER-READER" digest="sha256:5ff243cfe4df8145c5d35226a2dc361c7ca7aa637917f2ecc9aee44a91b75c04" -->

## 4. Verification

- [x] 4.1 DOM tests:
  - the phone Focus layout (stacked, one edge per drawn neighbour, no dots);
  - the stacked Overview;
  - the swipe stepping;
  - no swipe on a vertical move.
- [x] 4.2 Phone screenshots of the Overview, the Focus view, the Columns view and the Reader, and checks that nothing scrolls sideways.
- [x] 4.3 Run the full verification, the CLI checks and the public site's browser checks.
