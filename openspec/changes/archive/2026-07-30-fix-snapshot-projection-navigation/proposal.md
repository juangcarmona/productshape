# Proposal: fix-snapshot-projection-navigation

## Why

The focused neighbourhood shipped with a layout defect the product owner found on first use: expanding a group made its members collide with neighbouring groups and, on a one-directional artifact, run off the canvas entirely. `BC-PRODUCT-DEFINITION` — five incoming groups, the largest with twelve members — was the case that exposed it.

Two attempts to fix it within the shipped requirement failed, and both failures point at the same mistake in that requirement. Clamping the fan to the anchor's hemisphere kept members on canvas but crushed twelve labels into 24° of arc. Replacing the fan with a labelled column removed the collisions but stopped being a cloud, which is the shape the product owner chose deliberately.

The requirement itself is the problem. It says opening a satellite reveals its members **while leaving the other satellites in place**, which was recorded as a calmness decision when the projection was designed on paper. In practice it forbids the only fix that works: giving the opened group more room by re-allocating the whole hemisphere. The product owner has reversed that decision, treating the collisions as the defect they are and asking for the cloud to reorganise around whatever is open.

The same session established that a dense neighbourhood needs to be explorable rather than only viewable, so this change also adds panning and zooming, and moves the relationship type off the node and onto the spoke that carries it.

## What Changes

- **The cloud re-organises when a group opens or closes.** Each group is allocated an angular sector sized to what it currently needs — at minimum the width of its own label, plus a share of the slack by member count — so expanding one takes room from the others instead of overlapping them. The ring grows when the minimums cannot fit. Nothing collides at any expansion state, and nothing leaves the canvas.
- **Pan, zoom and fit.** Drag to pan, scroll to zoom, buttons for zoom in, zoom out and fit; arrow keys, `+`, `-` and `0` do the same from the keyboard, so navigating the canvas is not pointer-only.
- **The relationship type annotates the spoke, not the satellite.** A satellite now carries the artifact kind and the count; the type (`applies-to`, `defined-in`, `bounded-context`) labels the line it belongs to. Direction remains positional, so nothing is lost by dropping the arrow glyph from the node label.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `snapshot-generation`: the focused-neighbourhood requirement replaces "leaving the other satellites in place" with re-allocation on expansion, adds the collision and canvas guarantees, adds pan and zoom with keyboard equivalents, and moves the relationship type to the spoke.

## Impact

- **`packages/core`**: the focused projection's placement is rewritten — sector allocation by label width plus weight, members wrapping onto further rings inside their own sector, a viewBox derived from what was actually placed, and pan/zoom state over it.
- **Determinism**: unchanged. Placement remains a pure function of the model and of which groups are open; nothing settles and nothing is seeded. Pan and zoom are reader state, held nowhere but the current view.
- **Verification**: the collision and canvas guarantees are asserted against a fixture reproducing the shape that broke — five incoming groups with a twelve-member group among them — because a fixture with two or three groups cannot reach the failing geometry at all.
