---
id: CHG-SNAPSHOT-UX-001
type: product-change
title: Snapshot UX — kind icons, Reader structural context, and direct-draw single-member topology groups
status: applied
base-revision: 'dc1e2c9'
operations:
  add: []
  modify:
    - FR-SNAPSHOT-002
    - FR-SNAPSHOT-009
    - QR-PRESENTATION-001
    - QR-ACCESSIBILITY-001
  remove: []
---

## Problem

The Product Snapshot is functionally complete but hard to navigate for non-engineer readers (Product Owners, Tech Leads, new teammates — the `ACT-PRODUCT-EXPLORER` audience). Three specific friction points were identified through analysis of the generated snapshot at revision `dc1e2c9` (82 artifacts, 211 relationships) and recorded in issue #171:

1. **Kind recognition is engineer-facing.** Every artifact carries a monospace token (`ACT`, `FR`, `BR`, etc.) and a colour, but a non-technical reader has to learn what each token means before they can scan the list. There is no visual signal that communicates kind at a glance to someone who does not already know the methodology's identifier conventions.

2. **The Reader gives no sense of structural position.** A reader navigating from a Journey to its Use Cases to their Requirements moves horizontally, one artifact at a time, with no sense of where they are in the product's structure. The relationships are grouped by type and direction, but the Reader does not surface how the selected artifact relates to the levels above and below it — only its immediate neighbours.

3. **Single-member topology satellites add friction.** The Focused Topology draws an intermediate "satellite" node for every relationship group, showing the group's count. When a group has only one member, the satellite is an extra click to reach one artifact. For example, `UC-SNAPSHOT-EXPLORE-001` has 7 satellite groups, 4 of which have a count of 1 — each is a disclosure step with nothing to disclose.

## Intended Product Outcome

The Product Snapshot's requirements express three refinements that make the snapshot more navigable for non-engineer readers without changing its architecture, its progressive-disclosure model, or its single-file design:

- `QR-PRESENTATION-001` requires a meaningful inline-SVG icon per artifact kind, functional rather than decorative, accompanying the existing token text so kind is recognizable at a glance by readers who have not learned the identifier conventions.
- `QR-ACCESSIBILITY-001` requires that kind icons carry accessible names and that kind remains determinable without the icon, so the icon is an accelerator over the same text signal rather than a replacement for it.
- `FR-SNAPSHOT-002` requires the Reader to surface the selected artifact's structural context — where it sits in the product's hierarchy — so a reader can understand the artifact's position, not just its content and immediate neighbours.
- `FR-SNAPSHOT-009` requires single-member relationship groups in the Focused Topology to draw the related artifact directly rather than hiding it behind an intermediate satellite, removing a disclosure step that has no value when there is only one thing to disclose.

## Rationale

The snapshot's audience is broader than the engineers who author the model. Product Owners reviewing scope, Tech Leads preparing decisions, and new teammates all need to understand the product's shape without first learning what `FR` or `BR` means. The current tokens are precise and compact — and they stay — but they are a learned signal. A kind icon is an unlearned signal that works alongside the token, not instead of it, so the requirement is for a functional icon, not a decorative one.

The Reader's structural context addresses a different gap: the snapshot answers "what is this artifact?" and "what does it touch?" but not "where is this in the product?" A reader who follows a relationship from a Journey to a Use Case to a Requirement loses their bearings because the Reader shows each artifact in isolation. Surfacing structural context — bounded to the selected artifact, not the whole model — turns the Reader from a lookup into a navigation instrument.

The single-member satellite rule is a precision fix. The Focused Topology's progressive disclosure is valuable when a group has multiple members to expand or collapse; it is pure friction when a group has one. Drawing the one related artifact directly, with the relationship type still labelling the edge, removes a click without removing information. The rule is bounded: it applies only when a group has exactly one member, and the satellite remains for 2+ members where expand/collapse is meaningful.

Three open questions were resolved during review: kind icons will be embedded directly in the snapshot generator source (not as separate `.svg` asset files); the Reader's structural context will use kind-level ancestry (e.g., Bounded Context → Use Case → Functional Requirement) rather than instance-level breadcrumbs; and the Focused Topology's direct-draw threshold is 1–2 members (direct draw for groups of one or two, satellite for groups of three or more).

These refinements are proposed now because the snapshot is stable, the scaling analysis (issue #171) confirms the single-file design holds well beyond any realistic model size, and the UX gaps are the next thing a broader audience will hit.

## Affected Product Areas

- **Product Snapshot presentation** (`QR-PRESENTATION-001`): kind icons added as a presentation obligation.
- **Product Snapshot accessibility** (`QR-ACCESSIBILITY-001`): icon accessibility and kind-independence rules.
- **Artifact Reader** (`FR-SNAPSHOT-002`): structural context surfaced in the Reader.
- **Focused Topology** (`FR-SNAPSHOT-009`): single-member groups drawn directly.
- **Product Explorer journey** (`JRN-SNAPSHOT-001`, `UC-SNAPSHOT-EXPLORE-001`): indirectly affected — the journey's narrative already describes orientation, discovery, reading and traversal; these refinements sharpen the reading and traversal surfaces without changing the journey's structure.

## Open Questions

None.

## Product Acceptance

- A reader who has never seen the methodology can look at the artifact list and recognize at a glance whether an entry is an actor, a use case, or a requirement — by icon, without reading the token — while the token remains for those who prefer it.
- A reader who opens an artifact in the Reader can see where it sits in the product's structure — not just what it says and what it touches, but what level of the product it belongs to and what is above and below it.
- A reader who opens the Focused Topology on an artifact with single-member relationship groups sees those related artifacts directly, connected to the anchor, without an intermediate satellite to click through.
- All existing constraints continue to bind: the snapshot is still one self-contained file, still read-only, still progressively disclosed, still accessible without colour or pointer, and still a calm engineering instrument.

## Out of Scope

- Implementation: this change modifies product-definition requirements only. The snapshot generator (`packages/core/src/snapshot.ts`) is not touched by this change; implementation follows product approval.
- Multi-file snapshot: considered and retained as single-file (see issue #171's scaling analysis). The single-file constraint (`FR-SNAPSHOT-001`, `CON-NO-WEB-UI`) is not modified.
- Whole-product rendering: none of these refinements propose rendering every artifact simultaneously or adding a third graph projection. `FR-SNAPSHOT-005` continues to bind.
- Dark mode, theme switching, or dashboard treatment: `QR-PRESENTATION-001`'s appearance rules are not modified.
- New requirements or terms: this change modifies four existing requirements. No new artifacts are added.
- Delivery, technical design, verification, release or deployment.
