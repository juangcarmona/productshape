---
id: FR-SNAPSHOT-007
type: functional-requirement
title: Preserve spatial memory across focus changes
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-CANONICAL-001
verification:
  - scenario: An artifact occupies the same position in the landscape before and after any focus change
  - scenario: Changing focus never rearranges the product, and after ten consecutive selections every unfocused artifact is still where it started
  - scenario: The camera centres on the selected artifact and fits its neighbourhood, moving continuously rather than redrawing
  - scenario: The previously focused neighbourhood returns to the background rather than disappearing
  - scenario: Expanding a counted group inside a focus leaves the background arrangement unchanged
  - scenario: An explicit reset returns the map to the complete landscape from any focused state
  - scenario: A reduced-motion preference suppresses the camera transition while still arriving at the same view
  - scenario: Identical model content yields identical positions, and camera state is held nowhere but the address of the current view
---

## Requirement

Artifact positions in the Product Landscape MUST be stable. An artifact's position MUST be determined by
the compiled model alone, MUST be identical for identical model content, and MUST NOT change when the
selected artifact changes, when a focus is entered or cleared, when a counted group is expanded or
collapsed, or when band scope changes. Changing focus MUST NOT rearrange the product.

Entering a focused state MUST move the camera so that the selected artifact is centred and its
neighbourhood is fitted within the visible canvas. The movement MUST be continuous rather than an abrupt
redraw, so the reader can see where they came from and where they arrived. Where the reader's environment
expresses a reduced-motion preference, the transition MUST be suppressed and the same destination view
MUST be reached directly.

When focus moves from one artifact to another, the previously focused neighbourhood MUST return to the
background and remain visible there. It MUST NOT disappear, and the reader MUST NOT be required to
retrace their steps to find it again.

An explicit action MUST return the map to the landscape state from any focused state, clearing the focus
without clearing the reader's place in the product.

Camera position, zoom and focus history are reader state. They MUST NOT be persisted anywhere other than
the address of the current view.

## Rationale

Spatial memory is the only thing that makes a map worth more than a list, and it is destroyed by
re-arrangement. A reader learns that bounded contexts sit up there, that requirements crowd the lower
band, that one dense cluster is where the change flow lives — and that knowledge is what lets them
navigate by recognition instead of by reading every label again. An arrangement that re-solves whenever
focus changes produces a technically correct picture of the same model that is useless to return to,
because it is never the same place twice.

This is stated as its own requirement rather than folded into the map's content because it is a different
kind of claim and fails in a different way. What the map contains can be judged by looking at one
screenshot; whether positions are stable can only be judged by comparing two, before and after a
selection. Keeping it separate makes it independently verifiable, and it is the property most likely to
be lost quietly by an implementation that treats each focus as a fresh layout problem.

The camera moving continuously is what carries orientation across the transition. A cut leaves the reader
to work out from scratch where the new view sits relative to the old one, which is the same loss the
separate-tabs arrangement caused. Motion is doing real work here rather than decorating, which is why it
is required — and why the reduced-motion path must still arrive at the same view rather than a lesser
one, since a reader who suppresses animation is asking for less movement, not less product.

Returning the previous focus to the background rather than removing it is what makes exploration
cumulative. A reader who follows a relationship and then wants the artifact they came from should be able
to see it, not remember it. Keeping it visible costs nothing that was not already on screen.

Holding camera state only in the address keeps the map disposable and shareable in the same way the rest
of the snapshot is: a view worth returning to is a link, not something the file remembered on the
reader's behalf.

## Acceptance Scenarios

- A reader notes where three artifacts sit in the landscape, selects a fourth, and confirms all three are
  exactly where they were.
- A reader makes ten consecutive selections across different bands. Every artifact not currently focused
  occupies its original position, and the arrangement as a whole is unchanged.
- Selecting an artifact centres it and fits its neighbourhood inside the canvas; the movement is
  continuous, and a reader watching it can see the landscape it came from.
- With a reduced-motion preference set, the same selection arrives at the same centred, fitted view with
  no animation.
- After moving focus from one artifact to a second, the first artifact and its neighbours are still
  visible in the background.
- Expanding a counted group inside a focus changes nothing about the background arrangement, and
  collapsing it returns the focus to its previous shape.
- From a focused state, the reset action restores the complete landscape.
- Two snapshots generated from identical model content place every artifact identically. After exploring,
  browser storage and cookies contain nothing.
