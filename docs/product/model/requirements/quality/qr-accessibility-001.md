---
id: QR-ACCESSIBILITY-001
type: quality-requirement
title: Make the generated snapshot fully operable without a pointer or colour vision
status: active
quality-attribute: accessibility
applies-to:
  - UC-SNAPSHOT-EXPLORE-001
verification:
  - scenario: Every capability of the page is reachable and operable by keyboard alone, with no trapped focus and no pointer-only control
  - scenario: The focused element is always visibly identifiable, and focus lands somewhere meaningful after every view or selection change
  - scenario: The page exposes semantic landmarks and a heading hierarchy that describes the page without skipping levels
  - scenario: Selected and expanded state is exposed to assistive technology, and the current artifact is marked with aria-current where a set of navigable items exists
  - scenario: Every icon-only control has an accessible name that says what it does
  - scenario: All text meets WCAG 2.1 AA contrast against its background
  - scenario: No information is conveyed by colour alone, and no essential information requires hover or pointer proximity to reveal
  - scenario: With a reduced-motion preference set, no non-essential animation or transition runs
---

## Requirement

The generated Product Snapshot MUST be fully operable and fully understandable without a pointing device and without colour discrimination.

Every capability of the page — orientation, browsing, filtering, search, artifact selection, relationship traversal, group expansion, and every Graph Projection including node selection — MUST be reachable and operable using the keyboard alone, in an order that follows the page's visible structure, with no focus trap and no control that only a pointer can activate. Whenever the active view or the selected artifact changes, focus MUST land on an element that makes sense as the next place to be, rather than being lost or returned to the top of the document.

The element with focus MUST be visibly identifiable at all times. The page MUST expose semantic landmarks for its regions and a heading hierarchy that describes its structure without skipping levels. Selected state and expanded state MUST be exposed to assistive technology as state, not only as appearance, and the currently selected artifact MUST be marked with `aria-current` wherever it appears within a set of navigable items. Every control whose visible label is an icon or a symbol MUST carry an accessible name stating what it does.

All text MUST meet WCAG 2.1 AA contrast against its background. No information — including artifact kind, relationship direction, status, and selected state — MAY be conveyed by colour alone; each MUST also be carried by text, shape, position or another non-colour signal. No information a reader needs MAY require hovering or pointer proximity to reveal. Where the reader's environment expresses a reduced-motion preference, the page MUST NOT run non-essential animation or transition.

## Measurement

- **Keyboard completeness.** Enumerate every capability the snapshot offers, then operate each one using only the keyboard. The measure is the count of capabilities that cannot be reached or activated; the target is zero.
- **Focus visibility and placement.** Traverse the entire page by keyboard and, at every stop, record whether the focused element is visually identifiable. After each view change and each artifact selection, record where focus landed. The measure is the count of stops with no visible focus indicator and the count of transitions after which focus was lost or reset to the document start; the target is zero for both.
- **Structure.** Extract the landmark regions and the heading outline from the generated document. The measure is the count of missing landmarks for the page's regions and the count of skipped heading levels; the target is zero for both.
- **State exposure.** Inspect the accessible representation of the artifact list, the relationship groups, the collapsible neighbour groups, and the navigation between views. The measure is the count of selected, expanded or current states expressed only visually; the target is zero.
- **Accessible names.** Enumerate controls whose visible content is an icon or symbol. The measure is the count without an accessible name; the target is zero.
- **Contrast.** Compute the contrast ratio of every text-and-background pair the generated stylesheet can produce, including kind colours, status indicators, selected rows and snippet highlighting. The measure is the count of pairs below WCAG 2.1 AA for their text size; the target is zero.
- **Colour independence.** Render the page with colour removed and identify each piece of information the requirement names — artifact kind, relationship direction, status, selected state. The measure is the count no longer determinable; the target is zero.
- **Hover independence.** Enumerate information revealed on hover or pointer proximity. The measure is the count of such items that are not also available without a pointer; the target is zero.
- **Reduced motion.** Open the page with a reduced-motion preference expressed and record any animation or transition that still runs. The measure is the count of non-essential ones; the target is zero.

Each measurement is taken against the snapshot generated from the current ProductShape model and against a snapshot generated from a materially larger model containing dense relationships, high-degree artifacts, isolated artifacts, and long titles and bodies, so that states reachable only at scale — collapsed groups, truncated labels, long lists — are included.

## Verification

- An operator completes the whole exploration progression — orient, search, select an artifact, read it, read its relationships in both directions, expand a collapsed neighbour group, open a projection, select a neighbouring node, return by Back — without touching a pointing device.
- Keyboard traversal of the full page records a visible focus indicator at every stop, and focus placement after every view change and artifact selection is deliberate rather than lost.
- The generated document's landmarks and heading outline are extracted and reviewed: every region has a landmark and no heading level is skipped.
- The artifact list reports the selected artifact as current to assistive technology; collapsible neighbour groups report their expanded state; the active view is identifiable as current within the page's navigation.
- Every icon-only control is queried for its accessible name and each name states the control's action.
- Every text-and-background pair the stylesheet can produce is computed against WCAG 2.1 AA and passes, including the kind colours applied to text.
- With colour removed, a reader can still determine each artifact's kind, each relationship's direction, each artifact's status and which artifact is selected.
- With a reduced-motion preference set, opening the page, changing selection, expanding a group and opening a projection run without non-essential animation.
- Both the current-model snapshot and the larger-model snapshot pass every check above.
