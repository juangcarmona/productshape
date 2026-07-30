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
  - scenario: The orientation view states the count of artifacts of each kind present in the model and offers an entry point into each
  - scenario: The orientation view explains in plain language that the page is a generated, read-only projection that is never authoritative
  - scenario: The orientation view presents a kind-level aggregate of the relationships showing which kinds relate to which, by relationship type, with counts
  - scenario: The orientation view may report artifacts holding no relationships as a neutral group with an exact count and the artifact identities, using no warning, severity, scoring or pejorative language
  - scenario: The orientation view asserts no importance, health, ownership, ranking or lifecycle conclusion that the compiled model does not record
  - scenario: A model containing only some artifact kinds produces an orientation view describing only those kinds
---

## Requirement

The Product Snapshot MUST open in an orientation view whose purpose is to convey the shape of the
product, and which MUST NOT render any artifact's authored content and MUST NOT render any
artifact-level graph — that is, no projection in which individual artifacts appear as nodes.

The orientation view MUST expose:

- the product's identity as the model records it, and the source revision the snapshot was
  generated from, presented so a reader finds them without searching;
- the total number of artifacts and the total number of relationships in the compiled model;
- the number of artifacts of each kind present in the model, with an entry point from each kind
  into the artifacts of that kind;
- a plain-language statement that the page is a generated, read-only projection of authored files,
  regenerable at any time and never authoritative;
- a kind-level aggregate of the relationships, showing which artifact kinds relate to which
  artifact kinds, by relationship type, with the number of relationships in each combination.

The orientation view MAY report the artifacts that hold no relationships as a group, stating the
exact count and the identities of the artifacts in it, with each identity an entry point to that
artifact. Where it does, the group MUST be presented as derived topology and nothing more: it MUST
be labelled by the fact it reports — that these artifacts have no relationships — and MUST NOT use
warning or error presentation, severity, scoring, a health or completeness indication, or pejorative
vocabulary such as "orphaned", "dangling", "unused" or "missing". A relationship count of zero is a
count, and the orientation view MUST treat it as one.

The orientation view MUST derive everything it displays from the compiled model. It MUST NOT
assert importance, centrality, health, completeness, quality, ownership, ranking, ordering or
lifecycle progression that the model does not record, and MUST NOT present a derived count as a
judgement. Where the model's structure supports it, the orientation view MAY additionally offer a
high-level layered view as defined in FR-SNAPSHOT-005; it MUST NOT require one.

The orientation view MUST describe only the artifact kinds the model actually contains, and MUST
remain correct for a model that contains few kinds, one kind, or kinds in proportions unlike any
other product's.

## Rationale

A reader who has never seen the product needs to know what kind of thing it is before they can
usefully read any part of it, and the current snapshot answers that question by handing them
everything and letting them infer. Orientation is a different job from reading, and it is the job
the first screen should do: how big is this, what is it made of, how do the parts connect, and how
much should I trust what I am looking at.

The kind-level aggregate is what makes orientation possible without drawing the graph. In the
current baseline, 196 relationships collapse into 16 distinct combinations of source kind, target
kind and relationship type — a table a reader can absorb, describing the same traceability that 196
lines on a circle obscure. That compression is not a simplification of the model; it is the model's
own type structure, which is the level at which "how does this product hold together" is actually
answerable.

The prohibition on fabricated conclusions matters more on the orientation view than anywhere else,
because a summary is read as authoritative. A page that ranked artifacts by connection count, or
flagged something as incomplete, or ordered kinds by apparent importance, would be inserting product
judgements the authored files never made — and inserting them at the exact moment a reader is least
able to tell the difference. Counts are facts about the compiled graph; everything beyond counts
would be the snapshot becoming a second, quieter source of product truth.

Requiring the view to describe only the kinds actually present keeps the snapshot generic. A
product whose model has no bounded contexts should not be shown an empty band or a zero, because a
zero implies an absence the adopter may not consider one.

Reporting artifacts with no relationships is permitted for the same reason the counts are: it is a
fact about the compiled graph, and a useful one, because an unconnected artifact is otherwise the
hardest thing in the model to reach — it appears in no relationship group anywhere. The current
baseline has three (`CON-BRAND-001`, `CON-NO-WEB-UI`, `CON-PUBLIC-GENERIC`) and they are entirely
legitimate: a constraint that governs the product globally needs no edge to earn its place. That is
precisely why the presentation rules are strict. "Three artifacts have no relationships" is
topology; "three orphaned artifacts" is a verdict on the model's health that the snapshot has no
standing to deliver, and that a reader would carry back to the repository side as though the product
had said it.

## Acceptance Scenarios

- A reader opens a snapshot for the first time. Without scrolling past the first screen they can
  state which product it is, which revision it reflects, roughly how large the model is, what kinds
  of artifact it contains, and that the page is generated and read-only. Inspecting the document
  confirms no artifact body and no artifact-level graph is present.
- The reader reads the kind-level aggregate and can state, without opening any artifact, that use
  cases are governed by business rules, that functional requirements derive from use cases, and how
  many such relationships exist.
- The counts shown for artifacts, relationships and each kind are compared against
  `prodshape graph` output for the same model and match exactly.
- The orientation view is examined for any claim beyond identity, revision, counts, entry points,
  the projection explanation and the kind-level aggregate. No artifact is described as important,
  central, healthy, complete, owned, ranked or ordered by anything other than a stated, derived
  criterion.
- A snapshot is generated from a model containing only actors and use cases. The orientation view
  describes those two kinds and does not mention or zero-fill the others.
- A snapshot is generated from a model whose artifacts have no relationships at all. The
  orientation view reports zero relationships and an empty aggregate without appearing broken.
- The orientation view for the current baseline reports that three artifacts hold no relationships
  and names `CON-BRAND-001`, `CON-NO-WEB-UI` and `CON-PUBLIC-GENERIC`, each selectable. The report
  carries no warning styling, no severity, no score and no word suggesting the condition is a
  defect; a reader shown only that group cannot tell whether the product owner considers it a
  problem, because the page does not say.
