---
'@prodshape/core': minor
'@prodshape/cli': minor
---

The Product Snapshot gains three map views (CHG-SNAPSHOT-V2):

- **Overview map.** It opens on every artifact as a chip, grouped by kind, with use cases and domain terms gathered under their bounded context.
- **Focus view** (`#/focus/ID`). It centres one artifact with its neighbours grouped by kind around it and the rest of the model faded behind, with a breadcrumb.
- **Columns view** (`#/columns`). It shows one column per kind with every relationship drawn.

Every map pans, zooms (wheel, pinch, controls, `+ - 0`) and is operable by keyboard. Hovering or focusing an artifact lights its neighbourhood in a neon glow in both appearances.

A **business lens** (header toggle or `l`) presents a use case in business language. It shows the goal and trigger, who uses it, the rules it must obey, how they are proved, what else it must be, and what a change would put in question, with no identifiers.

The Focused Topology pane beside the Reader is replaced by the Focus view and a Focus action in the Reader. Addresses from earlier snapshots keep working: `#/graph/focus/ID` now opens the Focus view.
