# Tasks: fix-snapshot-projection-navigation

Defect found by the product owner on first use of the focused neighbourhood, and their reversal of the "satellites stay in place" decision recorded on `CHG-SNAPSHOT-002`.

## 1. Re-allocate the arrangement on expand and collapse

- [x] 1.1 Give each group an angular sector of at least the width its own label needs, sharing the slack out by member count; grow the ring when the minimums cannot fit the hemisphere.
- [x] 1.2 Fan members inside their group's own sector, wrapping onto further rings when one ring cannot hold their labels.
- [x] 1.3 Derive the viewBox from what was actually placed, so nothing can be clipped.
- [x] 1.4 Re-render on expand and collapse so the arrangement always reflects what is open.
- [x] 1.5 Tests against a fixture reproducing the shape that broke — five incoming groups, one with twelve members: expanding re-allocates, collapsing returns the arrangement, satellites never come within a diameter of each other, kind labels never overlap, and nothing is placed outside the viewBox.

## 2. Pan, zoom and fit

- [x] 2.1 Drag to pan and scroll to zoom about the pointer, with zoom bounded either side of the fit.
- [x] 2.2 Zoom in, zoom out and fit buttons with text labels rather than icons.
- [x] 2.3 Keyboard equivalents: arrow keys pan, `+` and `-` zoom, `0` fits.
- [x] 2.4 Tests: the buttons change and restore the viewBox, and the keyboard does the same.

## 3. Relationship type on the spoke

- [x] 3.1 Label the spoke with the relationship type; leave the artifact kind and count on the satellite.
- [x] 3.2 Drop the arrow glyph from the satellite label, direction being positional already.
- [x] 3.3 Tests: types appear as edge labels, kinds as satellite labels, and no type or arrow remains in a satellite label.

## 4. Model correction

- [x] 4.1 Modify the focused-neighbourhood requirement: replace "leaving the other satellites in place" with re-allocation, add the collision and canvas guarantees, add pan and zoom, move the type to the spoke.
- [x] 4.2 Correct the resolution recorded on `CHG-SNAPSHOT-002` so it states the decision the product owner actually made, rather than the one it superseded.
- [x] 4.3 Full suite, lint, typecheck, format check; screenshots re-captured.
