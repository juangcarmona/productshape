---
id: FR-SNAPSHOT-003
type: functional-requirement
title: Orient the reader before exposing the product corpus
status: active
derived-from:
  - UC-SNAPSHOT-EXPLORE-001
  - BR-CANONICAL-001
verification:
  - scenario: The state the snapshot opens in contains no artifact body and no artifact-level graph
  - scenario: The orientation view states the product identity, the source revision, the total artifact count and the total relationship count
  - scenario: The orientation view states the count of artifacts of each kind present in the model and offers an entry point into each canonical artifact family
  - scenario: The orientation view explains in plain language that the page is a generated, read-only projection that is never authoritative
  - scenario: The orientation view presents a kind-level aggregate of the relationships showing which kinds relate to which, by relationship type, with counts
  - scenario: Global search is permanently accessible from the orientation view
  - scenario: The orientation view may report artifacts holding no relationships as a neutral group with an exact count and the artifact identities, using no warning, severity, scoring or pejorative language
  - scenario: The orientation view asserts no importance, health, ownership, ranking or lifecycle conclusion that the compiled model does not record
  - scenario: A model containing only some artifact kinds produces an orientation view describing only those kinds
---

## Requirement

The Product Snapshot MUST open in an orientation view — the Product Explorer's Overview — whose purpose is to convey the aggregate shape of the product. It MUST NOT render any artifact's authored content and MUST NOT render any artifact-level graph: no projection in which individual artifacts appear as nodes. The Overview communicates the aggregate shape of the product; it does not draw every artifact.

The Overview MUST expose:

- the product's identity as the model records it, and the source revision the snapshot was generated from, presented so a reader finds them without searching;
- the total number of artifacts and the total number of relationships in the compiled model;
- the number of artifacts of each kind present in the model, with an entry point from each kind into the artifacts of that canonical family — actors, journeys, use cases, business rules, domain terms, bounded contexts, requirements and the rest;
- a plain-language statement that the page is a generated, read-only projection of authored files, regenerable at any time and never authoritative;
- a kind-level aggregate of the relationships, showing which artifact kinds relate to which artifact kinds, by relationship type, with the number of relationships in each combination;
- permanent access to global search.

The Overview MAY report the artifacts that hold no relationships as a group, stating the exact count and the identities of the artifacts in it, with each identity an entry point to that artifact. Where it does, the group MUST be presented as derived topology and nothing more: labelled by the fact it reports, with no warning or error presentation, no severity, no scoring, no health or completeness indication, and no pejorative vocabulary such as "orphaned", "dangling", "unused" or "missing". Model-health indicators of any other kind MAY appear only where the canonical data already supports them.

The Overview MUST derive everything it displays from the compiled model. It MUST NOT assert importance, centrality, health, completeness, quality, ownership, ranking, ordering or lifecycle progression that the model does not record, and MUST NOT present a derived count as a judgement.

The Overview MUST describe only the artifact kinds the model actually contains, and MUST remain correct for a model that contains few kinds, one kind, or kinds in proportions unlike any other product's.

## Rationale

A reader who has never seen the product needs to know what kind of thing it is before they can usefully read any part of it. Orientation is a different job from reading, and it is the job the first screen should do: how big is this, what is it made of, how do the parts connect in aggregate, and how much should I trust what I am looking at.

The kind-level aggregate is what makes orientation possible without drawing the graph: the model's relationships collapse into a small table of kind-to-kind combinations, which is the level at which "how does this product hold together" is actually answerable. Search being permanently reachable from the first screen serves the reader who arrived already knowing what they want — orientation must never be a toll gate.

The prohibition on fabricated conclusions matters most here, because a summary is read as authoritative. Counts are facts about the compiled graph; everything beyond counts would make the snapshot a second, quieter source of product truth. The same reasoning bounds model-health indicators to what canonical data already supports: "three artifacts have no relationships" is topology, and anything more would be a verdict the snapshot has no standing to deliver.

## Acceptance Scenarios

- A reader opens a snapshot for the first time. Without scrolling past the first screen they can state which product it is, which revision it reflects, roughly how large the model is, what kinds of artifact it contains, and that the page is generated and read-only. Inspecting the document confirms no artifact body and no artifact-level graph is present.
- The reader reads the kind-level aggregate and can state, without opening any artifact, which kinds govern which, which derive from which, and how many such relationships exist; the counts match `prodshape graph` output exactly.
- From the Overview the reader enters each canonical artifact family present in the model, and reaches global search without leaving the first screen.
- The Overview is examined for any claim beyond identity, revision, counts, entry points, the projection explanation and the aggregate. No artifact is described as important, central, healthy, complete, owned, ranked or ordered by anything other than a stated, derived criterion.
- A snapshot generated from a model containing only actors and use cases describes those two kinds and does not mention or zero-fill the others; a model with no relationships produces an Overview that reports zero without appearing broken.
- The no-relationships group, where shown, names its artifacts, each selectable, with no warning styling, severity, score or word suggesting a defect.
