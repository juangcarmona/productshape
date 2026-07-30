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
  - scenario: Search, artifact selection and focused-projection rendering respond without perceptible delay on both a current-scale and a materially larger model, and their latency is measured and recorded rather than asserted
  - scenario: Concrete interaction budgets are established from measurement on an identified representative environment during technical design, before implementation is approved
  - scenario: Interaction latency does not degrade materially as the model grows across the representative models
  - scenario: A high-degree artifact, an isolated artifact and an artifact with a long title and long body are all readable at every measured scale
---

## Requirement

The Product Snapshot MUST remain usable as the product model it projects grows well beyond the model
the product defines for itself.

The document the page renders when it opens MUST NOT grow in proportion to the number of artifacts in
the model. Because the opening state renders no artifact content and no artifact-level graph, its
size MUST be bounded by the number of artifact kinds present and the kind-level aggregate over them,
not by the artifact count. Artifact content and relationship structure MUST be carried in the file
as data that the page renders on demand.

Generated file size MUST grow no worse than linearly with the volume of authored content, and
generation time MUST grow no worse than linearly with the number of artifacts. Neither may degrade
superlinearly through relationship density.

Interaction MUST be responsive: displaying search results, showing a selected artifact, and rendering
the focused neighbourhood projection MUST each complete without delay the reader perceives as waiting,
and MUST NOT degrade materially as the model grows across the representative models.

The latency of each of those interactions MUST be measured on an identified representative
environment — named hardware, operating system and browser version, with the file opened over
`file://` — and the figures MUST be recorded. Concrete numeric budgets MUST be established from
those measurements during technical design, and MUST be agreed before implementation is approved.
This requirement deliberately states no numeric interaction budget: no such measurement exists yet,
and a number chosen before the first measurement would be a guess presented as a commitment.

The file-size and generation-time figures above are different in kind: they rest on measurements
already recorded against the pre-change snapshot, which is why they carry targets here and the
interaction figures do not.

Artifacts that are hardest at scale — the most connected artifact, an artifact with no relationships,
and an artifact with a long title and a long body — MUST remain readable at every measured scale.

## Measurement

**Representative models.** All measurements are taken against a fixed set:

1. The current ProductShape model — measured at 73 artifacts and 196 relationships.
2. A materially larger synthetic model of roughly five times that size — measured at 365 artifacts
   and 1,645 relationships.
3. A materially larger synthetic model of roughly ten times that size — measured at 730 artifacts
   and 3,290 relationships, with a maximum artifact degree of 171 and 30 artifacts holding no
   relationships.

The synthetic models MUST contain dense relationships, high-degree artifacts, isolated artifacts,
and long titles and bodies, so that the hard cases are present rather than assumed away.

**Baseline recorded against the pre-change snapshot**, establishing what is being improved:

| Model     | Artifacts | Relationships | File size   | Markup rendered at open | Inert data  | Generation  |
| --------- | --------- | ------------- | ----------- | ----------------------- | ----------- | ----------- |
| Current   | 73        | 196           | 459,704 B   | 299,059 B (65%)         | 151,764 B   | 0.34–0.38 s |
| Synthetic | 365       | 1,645         | 2,371,535 B | 1,617,762 B (68%)       | 739,276 B   | 0.38–0.43 s |
| Synthetic | 730       | 3,290         | 4,736,837 B | 3,236,237 B (68%)       | 1,478,793 B | 0.60–0.94 s |

**Measures and targets:**

- **Opening document size.** Measure the bytes of markup present in the document when the page
  opens, for each representative model. The target is that this figure does not grow in proportion to
  artifact count: from the smallest to the largest representative model — a tenfold increase in
  artifacts — it must grow by less than a factor of two. The recorded baseline grows by a factor of
  10.8 and is the failure being corrected.
- **Rendered graph elements at open.** Count the graph nodes and edges present in the document when
  the page opens. The target is zero artifact-level nodes and zero artifact-level edges, at every
  scale. The recorded baseline renders 73/196, 365/1,645 and 730/3,290.
- **Generated file size.** Record the generated bytes per representative model and divide by the
  total authored artifact bytes. The target is that this ratio does not increase with model size.
- **Generation time.** Time three consecutive generations per representative model and record the
  range. The target is that the largest representative model completes within 5 s, and that time per
  artifact does not increase with model size. The recorded baseline is 0.34–0.94 s across a tenfold
  range and is not the problem this requirement addresses; it is the figure that must not regress.
- **Search responsiveness.** For each representative model, measure elapsed time from the reader
  pausing typing to results being displayed, for a query matching one artifact, a query matching
  roughly a tenth of the model, and a query matching every artifact. Report the distribution, not a
  single figure. No target is set here; see the interaction-budget note below.
- **Artifact-selection responsiveness.** For each representative model, measure elapsed time from
  selecting an artifact to its content being displayed, for the artifact with the longest body and
  for the artifact with the most relationships. Report the distribution. No target is set here.
- **Focused-projection responsiveness.** For each representative model, measure elapsed time from
  selection to the focused neighbourhood being rendered, for the highest-degree artifact and for an
  isolated artifact. Report the distribution. No target is set here.
- **Interaction latency growth.** Compare each interaction measure across the representative models.
  The target is that latency does not grow materially with model size — the same interaction on a
  tenfold larger model must not become a qualitatively different experience.
- **Hard-case readability.** For each representative model, select the highest-degree artifact, an
  isolated artifact, and an artifact with a long title and long body, and record whether each is
  readable: relationships grouped and counted rather than spilled, absent relationships reported
  rather than blank, and long text laid out without overflowing its container or forcing horizontal
  page scrolling. Target: readable in all cases.

**On interaction budgets.** No numeric budget for search, selection or focused-projection latency is
set by this requirement, because none has been measured. The measurement procedure above exists to
produce those figures on an identified environment — hardware, operating system and browser version
recorded with the numbers — and the budgets are then set from what is observed and agreed during
technical design, before implementation is approved. Any numeric budget proposed before that
measurement is a technical hypothesis and MUST be recorded as one rather than as a threshold this
requirement imposes. The file-size, opening-document and generation-time targets above do carry
numbers, because measurements against the pre-change snapshot already exist to support them.

## Verification

- The opening document is measured for all three representative models. Artifact-level markup, nodes
  and edges are absent from every one, and the opening document's size across a tenfold growth in
  artifacts grows by less than a factor of two.
- Generated size per authored byte and generation time per artifact are recorded for all three
  models; neither ratio increases with model size, and the largest model generates within 5 s.
- Search, artifact selection and focused-projection timings are recorded for every case named above,
  on all three models, on an environment identified by hardware, operating system and browser
  version. The figures are reported in full, including the slowest cases.
- Concrete interaction budgets are derived from those recorded figures and agreed during technical
  design; implementation approval does not proceed until they exist. No budget is asserted in advance
  of the measurement.
- Each interaction is compared across the three models and confirmed not to degrade materially with
  model size.
- The highest-degree artifact of the largest representative model is opened: its neighbours are
  grouped and counted, nothing expands unbidden, and the page stays responsive while a group is
  expanded.
- An isolated artifact is opened at every scale and reads normally, reporting no relationships in
  either direction.
- An artifact with a long title and a long body is opened at every scale; text wraps within its
  container and the page does not scroll horizontally.
- All measurements are recorded — model, measure, figure, hardware and browser — so the thresholds
  above rest on evidence and any later regression is detectable against the same procedure.
