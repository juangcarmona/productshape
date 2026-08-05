---
id: QR-PRESENTATION-001
type: quality-requirement
title: Present the snapshot as a calm, compact, text-first engineering instrument
status: active
quality-attribute: presentation
applies-to:
  - UC-SNAPSHOT-EXPLORE-001
verification:
  - scenario: The interface renders in a single light appearance, with no dark variant and no theme switching
  - scenario: Body and interface text use the reader's system sans-serif stack, and artifact identifiers and revision values render monospaced
  - scenario: Text contrast is strong throughout, and the layout uses thin borders, deliberate alignment and square or low-radius controls
  - scenario: Colour use is restrained to one accent plus a stable per-artifact-kind palette that does not change between artifacts, views or regenerations
  - scenario: The page contains no gradient, glass or blur effect, decorative illustration, oversized hero typography or rounded-card dashboard treatment
  - scenario: Artifact kind, relationship direction, status and selection are each conveyed by text, shape or position and never by colour alone
  - scenario: Information density is high enough that orientation, the artifact list and one artifact's identity and relationships are legible together on an ordinary desktop viewport without decorative whitespace displacing content
  - scenario: Every property above is confirmed by inspecting the rendered page in a browser and recorded as screenshots at desktop and narrow viewports
---

## Requirement

The generated Product Snapshot MUST present itself as a precise, calm engineering instrument rather than a decorated document or a dashboard.

**Appearance.** The interface MUST render in a single light appearance. It MUST NOT provide a dark variant, a theme control or any appearance preference.

**Typography.** Body and interface text MUST use the reader's system sans-serif stack. Artifact identifiers and revision values MUST render in a monospaced face wherever they appear, so an identifier is recognizable as an identifier and comparable character by character. No font may be fetched; the requirement is satisfied with faces the reader's system already provides.

**Contrast and structure.** Text contrast MUST be strong throughout. Structure MUST be carried by thin borders, deliberate alignment and consistent spacing rather than by elevation, shadow or enclosure. Controls MUST be square or low-radius.

**Colour.** Colour use MUST be restrained: one accent for interactive and selected state, plus a stable palette identifying artifact kinds. A kind's colour MUST be the same in every view, for every artifact of that kind, and across regenerations. Colour MUST NOT be the sole carrier of any meaning: artifact kind, relationship direction, artifact status and selection MUST each also be conveyed by text, shape or position.

**Density.** The interface MUST be compact. Orientation, the artifact list, and the selected artifact's identity and relationships MUST be legible together on an ordinary desktop viewport without decorative whitespace displacing content that the reader needs.

**Prohibited treatments.** The page MUST NOT use gradients, glass or blur effects, decorative illustration, oversized hero typography, or a generic rounded-card dashboard treatment of its content.

These properties are product obligations about the reading experience, not a stylesheet. How they are realized — the specific values, the layout technique, the implementation — is a technical-design decision, and the requirement is verified against the rendered page rather than against source.

## Measurement

Measured by inspecting the rendered page in a browser, at a desktop viewport and at a narrow viewport, for a snapshot generated from the current ProductShape model and for one generated from a materially larger model containing high-degree artifacts, isolated artifacts and long titles and bodies. Each measure below is a count with a target of zero, and the inspection is recorded as screenshots so a later regression is comparable against the same evidence.

- **Appearance.** Open the page with the reader's environment expressing a light preference and again expressing a dark preference. Measure: the number of appearances rendered other than the single light one, and the number of controls offering a theme or appearance choice.
- **Typography.** Inspect the computed font of body text, interface text, artifact identifiers and revision values. Measure: the count of text runs not using the system sans-serif stack where prose is expected, plus the count of identifier and revision occurrences not rendered monospaced.
- **Contrast.** Covered quantitatively by QR-ACCESSIBILITY-001 against WCAG 2.1 AA. Measure here: the count of text-and-background pairs that pass AA but read as low-contrast in the rendered page — reported as a finding for design review rather than a failure.
- **Structure.** Inspect the rendered borders, alignment and control shapes. Measure: the count of regions delimited by shadow or elevation instead of a border, the count of misaligned column or row edges within one region, and the count of controls whose corner radius reads as pill or capsule rather than square or low-radius.
- **Colour restraint and stability.** Enumerate the distinct accent colours the rendered page uses, and the colour applied to each artifact kind in every view. Measure: the count of accent colours beyond one, plus the count of kinds rendered in more than one colour across views, artifacts or two regenerations from identical content.
- **Colour independence.** Render with colour removed. Measure: the count of the four meanings — kind, relationship direction, status, selection — no longer determinable. Shares its procedure with QR-ACCESSIBILITY-001.
- **Density.** At an ordinary desktop viewport, record whether orientation, the artifact list, and the selected artifact's identity and relationships are legible together without scrolling past decorative space. Measure: the count of those three that are not.
- **Prohibited treatments.** Inspect the rendered page for gradients, glass or blur effects, decorative illustration, hero-scale typography, and content enclosed in rounded cards in a dashboard arrangement. Measure: the count of occurrences.

## Verification

- The page is opened with a light and then a dark environment preference. It renders identically, in its single light appearance, and no theme or appearance control exists anywhere on it.
- Computed styles confirm system sans-serif prose and interface text, and monospaced rendering of every artifact identifier and every revision value — in the orientation view, the artifact list, the artifact detail, the relationship groups, the search results and the projections.
- The rendered page is reviewed against the structure measures: regions are delimited by thin borders, columns and rows align within each region, and controls are square or low-radius.
- The rendered page uses one accent colour. Each artifact kind's colour is recorded from every view and is identical in all of them, and identical again in a second snapshot generated from the same model content.
- With colour removed, a reader can still determine each artifact's kind, each relationship's direction, each artifact's status and which artifact is selected.
- At a desktop viewport, orientation, the artifact list and the selected artifact's identity and relationships are all legible without decorative space displacing them; at a narrow viewport the layout adapts as FR-SNAPSHOT-002 requires and remains compact rather than sparse.
- The rendered page is searched for gradients, glass or blur effects, decorative illustration, hero-scale typography and rounded-card dashboard treatment. None is present.
- Screenshots at both viewports, for both representative models, are recorded alongside the measures, so the presentation this requirement describes is evidenced rather than asserted.
