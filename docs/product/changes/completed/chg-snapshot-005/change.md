---
id: CHG-SNAPSHOT-005
type: product-change
title: Redesign the Product Explorer shell for reading, finding and both appearances
status: applied
base-revision: '752cac6'
operations:
  add: []
  modify:
    - QR-PRESENTATION-001
    - QR-ACCESSIBILITY-001
    - FR-SNAPSHOT-002
    - FR-SNAPSHOT-003
    - FR-SNAPSHOT-004
    - FR-SNAPSHOT-006
    - FR-SNAPSHOT-008
  remove: []
---

Schema reference: docs/specification/frontmatter-reference.md#product-change

## Problem

The Product Explorer's four surfaces are sound, but the definition that governs how they are presented holds the reader back:

- **Search is a region, not an action.** It is a fixed form above the artifact list, together with kind, status and context filters. On an ordinary desktop viewport it takes close to half of the list column permanently, whether or not the reader is searching. The name-or-identifier filter and the search box sit next to each other and read as the same control.
- **The reader's place in a long list is not kept.** Nothing requires the list to show which kind holds the selected artifact, to keep that entry in view, or to let the reader give the list's room to the Reader and the projection once they have found what they came for.
- **Identifiers in authored text are dead ends.** Artifact bodies and metadata name other artifacts by identifier constantly. The definition only requires relationship entries to be links, so a reader who sees `BR-CANONICAL-001` in a use case's prose has to search for it.
- **One appearance only.** QR-PRESENTATION-001 forbids a dark appearance and any appearance control. Many engineers read in a dark environment, and a light-only page sits badly beside every other tool they use.
- **Colour alone carries kind at a glance.** The kind palette has several close red-browns, and colour plus a text token is the only kind signal. There is no shape signal a reader can learn.
- **Orientation stops at counts.** The Overview's aggregate is a long table of kind, type and kind. It says how the model holds together, but it offers no way in beyond the kind families.

## Intended Product Outcome

The Product Explorer reads as a precise instrument in either appearance, and the definition says:

- **Search is an action present on every surface.** One visible control and a stated shortcut open it over the current surface, with the canonical narrowing available where the query is typed. It costs no space until it is used.
- **The Catalog shows its narrowing.** Every active filter is named beside the list and removable in one step.
- **The master area keeps the reader's place.** It groups artifacts by kind in collapsible groups. The group holding the selection is open, marked by more than colour, and scrolled to the entry. The master area collapses to a rail of kinds that still marks the selected kind.
- **The Reader turns known identifiers into links.** Every identifier of a known artifact in metadata and authored content is a link, and the authored text is displayed unchanged. The Reader offers previous and next within the current list and states the position.
- **Two appearances.** Light and dark, following the environment by default. One control offers light, dark and the environment's preference, and the reader's choice lives only in the address.
- **Kind is signalled three ways.** Colour, text token and a stable kind icon, with the icon always beside the token and never instead of it. The palette's kinds are distinguishable from one another.
- **The Overview offers ways in.** It may present the aggregate as a clickable kind-by-kind grid, and may offer derived entry points labelled by the facts they report: journeys in step order, contexts by reference count, and the artifacts with the most relationships.
- **The address carries presentation choices.** Appearance and a collapsed master area are in the address, and changing them replaces history rather than adding to it.
- **Accessibility covers the new devices.** Shortcuts are stated and never the only route, a dialog takes and returns focus, focus is visible inside the projections, and contrast holds in every appearance.

## Rationale

Every item follows from principles the model already holds, applied where the presentation had not reached them yet. Progressive disclosure argues against a search form that is always open. The "never silently truncated" rule argues for naming active filters. "Relationships are the methodology" argues for linking the identifiers authors already write in prose. Colour independence is stronger with a shape signal than with text alone.

The single-appearance rule was made to keep the page calm and to avoid a theme feature. A second appearance built to the same restraint keeps the calm and serves readers where they work. The persistence boundary in CON-NO-WEB-UI is honoured by carrying the choice in the address, exactly as discovery state is carried.

The direction was validated with the product owner through an interactive mockup built on this repository's own model. It was reviewed in both appearances, and the owner chose among alternatives:

- search as an overlay rather than a tab;
- a kind rail rather than hiding the master area;
- compact density;
- the revised palette;
- icons shown.

The product owner also decided to keep "the artifacts holding the most relationships" as an Overview entry point, as an ordering by a stated, shown count with no importance wording.

## Affected Product Areas

The Product Snapshot's Product Explorer:

- its presentation and appearance (`QR-PRESENTATION-001`);
- its accessibility obligations (`QR-ACCESSIBILITY-001`);
- the Artifact Reader and its master list (`FR-SNAPSHOT-002`);
- the Overview's aggregate and entry points (`FR-SNAPSHOT-003`);
- ranked search (`FR-SNAPSHOT-004`);
- the addressable state (`FR-SNAPSHOT-006`);
- the Catalog (`FR-SNAPSHOT-008`).

The Focused Topology (`FR-SNAPSHOT-009`) and the two-projection limit (`FR-SNAPSHOT-005`) are unchanged: the projection may be drawn differently, but what it must and must not show stays as defined. `CON-NO-WEB-UI` is unchanged and binding on every item above.

## Open Questions

None.

## Product Acceptance

Read the seven proposed artifacts against their baseline and confirm each of the following:

- Search, the master area, the Reader's identifier links, the Catalog's visible narrowing and the address state say what the Intended Product Outcome states.
- The appearance rule now requires light and dark with one control and address-only persistence, and every other presentation restraint is intact.
- The accessibility requirement covers shortcuts, dialogs, projection focus and contrast in every appearance.
- No requirement names an implementation technique.
- `prodshape change validate CHG-SNAPSHOT-005` reports zero errors.

## Out of Scope

- Delivery, technical design and implementation: the layout technique, the icon drawings, the palette values and the layout of the Focused Topology.
- Any change to what the Focused Topology must show, to the two-projection limit, or to CON-NO-WEB-UI.
- Improvements for phone-width viewports beyond preserving the existing narrow-viewport behaviour.
- New artifact kinds, new filterable properties, or any capability to create, edit or approve.
