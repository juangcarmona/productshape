---
'@prodshape/core': patch
---

Product Snapshot: the focused neighbourhood reorganises instead of colliding, and can be navigated

Expanding a relationship group made its members collide with neighbouring groups and, on a
one-directional artifact, run off the canvas. `BC-PRODUCT-DEFINITION` — five incoming groups, twelve
members in the largest — exposed it on first use.

The cause was a requirement, not just the code: it said opening a satellite must leave the other
satellites in place, which forbids the only fix that works. Two attempts inside that constraint failed —
clamping the fan crushed twelve labels into 24° of arc, and replacing the fan with a column stopped being
a cloud. The requirement has been corrected.

- **The arrangement re-allocates on expand and collapse.** Every group holds an angular sector at least
  as wide as its own label, with the slack shared out by member count, and the ring grows when the
  minimums cannot fit. Nothing overlaps and nothing is placed off-canvas at any expansion state; the
  viewBox is derived from what was actually placed rather than assumed.
- **Pan, zoom and fit** — drag, scroll, and text-labelled buttons, with arrow keys, `+`, `-` and `0` as
  keyboard equivalents so navigating the canvas is not pointer-only.
- **The relationship type moved to the spoke.** A satellite now carries the artifact kind and the count;
  the type labels the line. Direction stays positional, so the arrow glyph is gone from the node label.

Also fixes a bug that made the reader's expansions silently ignored: the open-state key was read before
the group's direction was assigned, so it never matched what a toggle had written.
