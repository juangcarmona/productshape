---
id: QR-SCALABILITY
type: quality-requirement
title: Stay usable as the product model grows
status: active
quality-attribute: scalability
applies-to:
  - UC-EXPLORER-GENERATE
  - UC-EXPLORER-BROWSE
verification:
  - scenario: The markup the file carries outside its embedded data does not grow in proportion to the number of artifacts; artifact content and every map are rendered from that data at open time or on demand
  - scenario: Generated file size grows no worse than linearly with authored content, and generation time grows no worse than linearly with artifact count
  - scenario: Loading the Explorer to a drawn Overview map, lighting a neighbourhood on hover, opening the Focus view, opening the Columns view, searching and filtering, opening an artifact, moving focus to a related artifact, expanding a Focus view group, and back/forward navigation each respond without perceptible delay on the representative models, measured and recorded rather than asserted
  - scenario: Concrete interaction budgets are established from measurement on an identified representative environment during technical design, before implementation is approved
  - scenario: Interaction latency does not degrade materially as the model grows across the representative models
  - scenario: A high-degree artifact, an isolated artifact and an artifact with a long title and long body are all readable at every measured scale
---

## Requirement

The Product Explorer MUST remain usable as the product model it projects grows well beyond the model the product defines for itself. Scalability is defined over the operations a reader actually performs, on representative models extending to an order of magnitude beyond the current model — including drawing the map views, which show every artifact.

The markup the file carries outside its embedded data MUST NOT grow in proportion to the number of artifacts in the model: it MUST be bounded by the number of artifact kinds present and the kind-level aggregate over them. Artifact content and relationship structure MUST be carried in the file as data, and every map view and every artifact's content MUST be rendered from that data at open time or on demand. The Overview map draws one compact chip per artifact; it MUST NOT draw any artifact's authored content and MUST NOT draw relationship lines until the reader attends to an artifact.

Generated file size MUST grow no worse than linearly with the volume of authored content, and generation time MUST grow no worse than linearly with the number of artifacts. Neither may degrade superlinearly through relationship density.

The measured interactions are the reader's operations:

1. loading the Explorer (opening the page to a drawn, usable Overview map);
2. lighting an artifact's neighbourhood by hover or keyboard focus on a map;
3. opening the Focus view, and the Columns view;
4. searching and filtering in the Catalog;
5. opening an artifact in the Reader and reading its relationships;
6. moving focus to a related artifact;
7. expanding a collapsed group in the Focus view;
8. back/forward navigation.

Each MUST complete without delay the reader perceives as waiting, and MUST NOT degrade materially as the model grows across the representative models. Each MUST be measured on an identified representative environment — named hardware, operating system and browser version, with the file opened over `file://` — and the figures recorded. Concrete numeric budgets MUST be established from those measurements during technical design and agreed before implementation is approved. Budgets already agreed from recorded measurements continue to bind; no new number may be asserted in advance of a measurement.

Artifacts that are hardest at scale — the most connected artifact, an artifact with no relationships, and an artifact with a long title and a long body — MUST remain readable at every measured scale.

## Measurement

**Representative models.** All measurements are taken against a fixed procedure:

1. the current ProductShape model;
2. a synthetic model generated at five times the reference shape;
3. a synthetic model generated at ten times the reference shape.

The measurement harness MUST compile each model and record its exact artifact count, relationship count, maximum degree and isolated-artifact count from the generated graph. Those figures are measurement output, not manually maintained values in this requirement. The synthetic models MUST contain dense relationships, high-degree artifacts, isolated artifacts, and long titles and bodies, so that the hard cases are present rather than assumed away.

Historical and current figures are produced by `pnpm measure:explorer` and recorded with the evidence for the revision measured. The canonical requirement defines the procedure and thresholds; it does not copy revision-specific model counts that become false after the next Product Change.

**Measures and targets:**

- **Static markup size.** Measure the bytes of markup the file carries outside its embedded data, for each representative model. Target: from the smallest to the largest representative model — a tenfold increase in the generated reference shape — it grows by less than a factor of two.
- **Overview map at open.** Count the chips and the relationship lines the Overview map draws at open. Target: exactly one chip per artifact and zero relationship lines, at every scale.
- **Generated file size.** Record the generated bytes per representative model and divide by the total authored artifact bytes. Target: the ratio does not increase with model size.
- **Generation time.** Time three consecutive generations per representative model and record the range. Target: the largest representative model completes within 5 s, and time per artifact does not increase with model size.
- **Reader-operation latency.** For each representative model, measure each of the eight operations above on its hardest cases — the query matching everything, the artifact with the longest body, the most connected artifact's neighbourhood, the largest bounded group. Report distributions, not single figures. Budgets come from these measurements during technical design; budgets already agreed from recorded measurements continue to bind.
- **Latency growth.** Compare each operation across the representative models. Target: the same operation on a tenfold larger model does not become a qualitatively different experience.
- **Hard-case readability.** At each scale, the highest-degree artifact, an isolated artifact and an artifact with a long title and long body are readable: relationships grouped and counted rather than spilled, absent relationships reported rather than blank, long text wrapping without horizontal page scrolling.

## Verification

- The static markup is measured for all three representative models: it grows by less than a factor of two across a tenfold growth in the generated reference shape, and the Overview map draws exactly one chip per artifact and no relationship line at open.
- Generated size per authored byte and generation time per artifact are recorded for all three models; neither ratio increases with model size, and the largest model generates within 5 s.
- The eight reader operations are timed on all three models on an identified environment, reported in full including the slowest cases; budgets are derived from those figures during technical design, and no budget is asserted in advance of measurement.
- Each operation is compared across the three models and confirmed not to degrade materially.
- The hard-case artifacts are opened at every scale and remain readable as defined above.
- All measurements are recorded — model, derived counts, measure, figure, hardware and browser — so any later regression is detectable against the same procedure.
