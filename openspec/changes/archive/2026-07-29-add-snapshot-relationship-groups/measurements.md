# Measurements: add-snapshot-relationship-groups

Evidence for `QR-SCALABILITY-001` and `QR-PRESENTATION-001` as `SLI-SNAPSHOT-004` scopes them. Reproduce with `pnpm measure:snapshot --scales 1,5,10` and `pnpm shots:snapshot`.

## Reference environment

Same as `SLI-SNAPSHOT-003`, extended with the browser this slice's visual evidence was captured on.

| Field    | Value                                        |
| -------- | -------------------------------------------- |
| Platform | Linux 6.6.87.2-microsoft-standard-WSL2 (x64) |
| CPU      | Intel Core Ultra 7 155H, 22 logical cores    |
| Memory   | 15.4 GiB                                     |
| Node     | v24.14.0                                     |
| DOM      | jsdom 30.0.0                                 |
| Browser  | Microsoft Edge (Chromium), headless          |

## Artifact-selection latency — no regression, and faster where it mattered

Hardest artifacts per model (longest body, highest degree), 20 timed iterations after 5 discarded warm-up rounds. Budget agreed in `SLI-SNAPSHOT-003`: **100 ms p95**.

| Model   | p95 before grouping | p95 after grouping | Change       |
| ------- | ------------------- | ------------------ | ------------ |
| current | 7.48 ms             | 7.93 ms            | +0.45 ms     |
| 5×      | 20.50 ms            | 18.00 ms           | −2.50 ms     |
| 10×     | 29.21 ms            | 24.00 ms           | **−5.21 ms** |

Grouping made the high-degree case cheaper rather than more expensive, because a collapsed group renders a summary row instead of its members: `BC-C-001` at 10× has 171 relationships and now builds a handful of summaries at selection time. That is design decision D4 paying off, and it is the opposite of the usual trade where structure costs performance. Every figure stays far inside the 100 ms budget.

## Generated file and opening document — unchanged in character

| Model   | File        | Opening document | Bytes per authored byte | Generation (ms) |
| ------- | ----------- | ---------------- | ----------------------- | --------------- |
| current | 250,641 B   | 8,978 B (4%)     | 1.725                   | 9.4–18.1        |
| 5×      | 1,233,668 B | 9,224 B (1%)     | 1.766                   | 25.7–28.4       |
| 10×     | 2,420,612 B | 10,057 B (0%)    | 1.736                   | 48.1–54.1       |

The opening document is byte-for-byte the same size as before this slice — grouping happens in the browser from data that already travelled — and still grows **1.12×** across a tenfold larger model. The file grew by 4,474 bytes, entirely the grouping code and its styles.

## Visual evidence

11 screenshots in `docs/assets/snapshot/`, captured headless at 1440×900 (desktop), 1440×2400 (tall, for states further down the page) and 430×900 (narrow). `manifest.json` records each route, viewport and caption.

This closes the four verification tasks `SLI-SNAPSHOT-003` had to leave open for want of a browser:

- **Visual review at both viewports** — shots 01–09.
- **Colour-removed pass** — shot 11: kind tokens, status text, selection border and the `→`/`←` direction glyphs all remain legible in greyscale.
- **Visible focus** — shot 10: the focus ring on the first list entry.
- **Long content wrapping** — shot 07: a long title and body at 430 px wide, wrapping inside the container with no horizontal page scrolling.

Headless Chromium captures the viewport at the top of the layout, so states further down the page are framed with a tall viewport rather than by scrolling; scrolling moves the content out of the captured region and yields a blank image. That is why shots 03 and 04 are 2400 px tall.
