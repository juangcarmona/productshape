---
id: CHG-EXPLORER-PHONE
type: product-change
title: 'Read the Product Explorer comfortably on a phone'
status: applied
base-revision: '88d0191bf8645a88f57abc3e31cc164b49630aff'
operations:
  add: []
  modify:
    - FR-EXPLORER-PROJECTIONS
    - FR-EXPLORER-READER
    - FR-EXPLORER-TOPOLOGY
    - QR-PRESENTATION
  remove: []
---

## Problem

On a phone the Product Explorer's maps are unreadable. Each map fits the whole drawing into the screen, so on a phone the chips and boxes shrink to a few pixels: the reader sees coloured dust, half the screen stays empty, and nothing can be read or tapped without zooming. The Focus view spreads its groups on two sides of the focus with the rest of the model around them, which is wider than a phone at any legible size. Reading one artifact works, but stepping through a long list means scrolling back to the top of each artifact to reach the previous and next controls.

The definition says how the page adapts to a narrow viewport only for the Reader. It says nothing about the maps or about a phone, so the generated page can keep shrinking a desktop drawing onto a phone and still satisfy it.

## Intended Product Outcome

A Product Stakeholder can open the Product Explorer on a phone and read it without zooming:

- **Overview map:** stacks its kind regions in one column at full label size, read by panning down.
- **Columns view:** opens with one column across the width, and the reader pans sideways to the others.
- **Focus view:** puts the focus at the top with its kind groups stacked beneath it, each neighbour still joined to it by a line, and leaves out the faded background, whose marks are too small to use there.
- **Fit control:** fits the width instead of the whole drawing.
- **Reader:** keeps previous, next and back-to-list within reach while the reader scrolls, and a horizontal swipe steps to the next or previous artifact.

`QR-PRESENTATION` states what "readable on a phone" means, so it can be measured:

- the header fits in one row;
- text and controls are comfortable to read and touch;
- maps open at full label size;
- nothing scrolls sideways.

## Rationale

The owner wants people to be able to browse and read the product calmly from a phone, even though it is not the usual way in. The maps are the Explorer's most distinctive views and, on a phone, its least usable ones. Laying them out for the width keeps every artifact, relationship and interaction they already have; only geometry changes. Leaving the Focus view's background out on a phone loses nothing: its marks are unreadable there, and the same artifacts are one step away in the Overview, the Catalog and search. The swipe and the sticky controls follow how people read a sequence on a phone, and stay shortcuts over controls that already exist.

## Affected Product Areas

The Product Explorer's map views (Overview, Focus, Columns), its Reader on a phone, and the presentation quality the Explorer is measured against.

## Open Questions

None.

## Product Acceptance

Approved by Juan G. Carmona, owner and decision maker of ProductShape, who asked for the Explorer to be usable on a phone and gave the go-ahead to define and deliver it in one change (the earlier phases 2 and 3 of the mobile plan). A reviewer confirms that:

- the modified requirements state the phone behaviour of each map and of the Reader;
- the faded background is left out only on a phone, and its artifacts stay reachable elsewhere;
- `QR-PRESENTATION` makes phone readability countable;
- `prodshape change validate CHG-EXPLORER-PHONE` reports zero errors.

## Out of Scope

- Desktop and narrow (tablet) layouts, which keep their current behaviour.
- The header, type size and catalog opening on a phone, already delivered as a fix against the existing requirements.
- An installable or offline application.
- Any change to what the Explorer shows, or to its addresses.
