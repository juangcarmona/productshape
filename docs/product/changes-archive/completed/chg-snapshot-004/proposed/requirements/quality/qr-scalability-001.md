---
id: QR-SCALABILITY-001
type: quality-requirement
title: Stay usable as the product model grows
status: active
quality-attribute: scalability
applies-to:
  - UC-SNAPSHOT-001
  - UC-SNAPSHOT-EXPLORE-001
verification:
  - scenario: The document rendered when the snapshot opens does not grow in proportion to the number of artifacts in the model
  - scenario: Generated file size grows no worse than linearly with authored content, and generation time grows no worse than linearly with artifact count
  - scenario: Loading the Explorer, searching and filtering, opening an artifact, reading its relationships, moving focus to a related artifact, expanding a bounded relationship group, and back/forward navigation each respond without perceptible delay on the representative models, measured and recorded rather than asserted
  - scenario: Concrete interaction budgets are established from measurement on an identified representative environment during technical design, before implementation is approved
  - scenario: Interaction latency does not degrade materially as the model grows across the representative models
  - scenario: A high-degree artifact, an isolated artifact and an artifact with a long title and long body are all readable at every measured scale
---

## Requirement

The Product Snapshot MUST remain usable as the product model it projects grows well beyond the model the product defines for itself. Scalability is defined over the operations a reader actually performs, on a representative corpus of roughly 730 artifacts — never over rendering the corpus simultaneously, which no surface does.

The document the page renders when it opens MUST NOT grow in proportion to the number of artifacts in the model. Because the opening state renders no artifact content and no artifact-level graph, its size MUST be bounded by the number of artifact kinds present and the kind-level aggregate over them, not by the artifact count. Artifact content and relationship structure MUST be carried in the file as data that the page renders on demand.

Generated file size MUST grow no worse than linearly with the volume of authored content, and generation time MUST grow no worse than linearly with the number of artifacts. Neither may degrade superlinearly through relationship density.

The measured interactions are the reader's operations:

1. loading the Explorer (opening the page to a usable Overview);
2. searching and filtering in the Catalog;
3. opening an artifact in the Reader;
4. reading its relationships;
5. moving focus to a related artifact;
6. expanding a bounded relationship group in the Focused Topology;
7. back/forward navigation.

Each MUST complete without delay the reader perceives as waiting, and MUST NOT degrade materially as the model grows across the representative models. Each MUST be measured on an identified representative environment — named hardware, operating system and browser version, with the file opened over `file://` — and the figures recorded. Concrete numeric budgets MUST be established from those measurements during technical design and agreed before implementation is approved. Budgets already agreed from recorded measurements continue to bind; no new number may be asserted in advance of a measurement.

Artifacts that are hardest at scale — the most connected artifact, an artifact with no relationships, and an artifact with a long title and a long body — MUST remain readable at every measured scale.

## Measurement

**Representative models.** All measurements are taken against a fixed set:

1. The current ProductShape model — recorded at 73 artifacts and 196 relationships when the baseline below was measured.
2. A materially larger synthetic model of roughly five times that size — 365 artifacts and 1,645 relationships.
3. A materially larger synthetic model of roughly ten times that size — 730 artifacts and 3,290 relationships, with a maximum artifact degree of 171 and 30 artifacts holding no relationships.

The synthetic models MUST contain dense relationships, high-degree artifacts, isolated artifacts, and long titles and bodies, so that the hard cases are present rather than assumed away.

**Baseline recorded against the pre-change snapshot**, establishing what is being improved:

| Model | Artifacts | Relationships | File size | Markup rendered at open | Inert data | Generation |
| --- | --- | --- | --- | --- | --- | --- |
| Current | 73 | 196 | 459,704 B | 299,059 B (65%) | 151,764 B | 0.34–0.38 s |
| Synthetic | 365 | 1,645 | 2,371,535 B | 1,617,762 B (68%) | 739,276 B | 0.38–0.43 s |
| Synthetic | 730 | 3,290 | 4,736,837 B | 3,236,237 B (68%) | 1,478,793 B | 0.60–0.94 s |

**Measures and targets:**

- **Opening document size.** Measure the bytes of markup present in the document when the page opens, for each representative model. Target: from the smallest to the largest representative model — a tenfold increase in artifacts — it grows by less than a factor of two.
- **Rendered graph elements at open.** Count the artifact-level nodes and edges present in the document when the page opens. Target: zero, at every scale.
- **Generated file size.** Record the generated bytes per representative model and divide by the total authored artifact bytes. Target: the ratio does not increase with model size.
- **Generation time.** Time three consecutive generations per representative model and record the range. Target: the largest representative model completes within 5 s, and time per artifact does not increase with model size.
- **Reader-operation latency.** For each representative model, measure each of the seven operations above on its hardest cases — the query matching everything, the artifact with the longest body, the most connected artifact's neighbourhood, the largest bounded group. Report distributions, not single figures. Budgets come from these measurements during technical design; budgets already agreed from recorded measurements continue to bind.
- **Latency growth.** Compare each operation across the representative models. Target: the same operation on a tenfold larger model does not become a qualitatively different experience.
- **Hard-case readability.** At each scale, the highest-degree artifact, an isolated artifact and an artifact with a long title and long body are readable: relationships grouped and counted rather than spilled, absent relationships reported rather than blank, long text wrapping without horizontal page scrolling.

## Verification

- The opening document is measured for all three representative models: artifact-level markup, nodes and edges are absent from every one, and its size across a tenfold growth in artifacts grows by less than a factor of two.
- Generated size per authored byte and generation time per artifact are recorded for all three models; neither ratio increases with model size, and the largest model generates within 5 s.
- The seven reader operations are timed on all three models on an identified environment, reported in full including the slowest cases; budgets are derived from those figures during technical design, and no budget is asserted in advance of measurement.
- Each operation is compared across the three models and confirmed not to degrade materially.
- The hard-case artifacts are opened at every scale and remain readable as defined above.
- All measurements are recorded — model, measure, figure, hardware and browser — so any later regression is detectable against the same procedure.
