---
'@prodshape/core': minor
---

Product Snapshot: relationships grouped by type and kind, with exact counts

An artifact's relationships were a flat list per direction — `BC-PRODUCT-DEFINITION` in this
repository's own model spilled 27 undifferentiated rows, and a ten-times-larger model reaches 171.
They are now grouped and counted.

- Each direction is grouped by **relationship type** and then by the **artifact kind** at the other
  end, and every group states its **exact count**.
- A group of more than eight members **starts collapsed**, showing its count instead of its members,
  and expands only when asked. Smaller groups stay open so nothing is hidden without reason. A lone
  large group collapses too — being the only group does not make it small.
- Collapsed groups render no members until first opened, so selecting a high-degree artifact got
  **faster**: p95 selection latency on a 730-artifact model improved from 29.2 ms to 24.0 ms.
- Disclosure uses the platform's own `<details>`/`<summary>`, so expansion is keyboard-operable and
  announces its state without ARIA to maintain.
- Declared and derived directions stay separately labelled, every entry keeps its relationship type
  and direction, and every related artifact stays one step away.

The complete list of typed, directed relationships remains readable without any visualization — the
substance the focused neighbourhood projection will accelerate rather than replace.
