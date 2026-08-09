---
id: CHG-OPENSPEC-071
type: product-change
title: OpenSpec integration is two mechanisms, citations that bind and sidecars that inform
status: applied
base-revision: '08cd643'
operations:
  add: []
  modify:
    - FR-OPENSPEC-001
  remove: []
---

## Problem

`FR-OPENSPEC-001` states that the product integrates with OpenSpec "exclusively through sidecar artifacts". The shipped integration does something else: the first working binding (issue #71, Layer 1) places citations inline inside native OpenSpec documents, authored by the human or agent writing the document, and verifies them with `citations verify`. The word "exclusively" makes the requirement and the working integration contradict each other, and the experiment record lists the citation carrier question as a decision still open, so the requirement decided ahead of the evidence.

The requirement also guarantees that native OpenSpec artifacts stay byte-identical across the integration. Stated over the whole integration, that guarantee is now false: a citation lives inside a native document by design. Stated over what the adapter writes, it remains exactly right.

## Intended Product Outcome

`FR-OPENSPEC-001` describes two mechanisms with distinct ownership.

Citations bind. An OpenSpec document that depends on canonical product text carries a citation to every artifact it derives from. Citations live in the consumer document, are authored by whoever authors that document, and are verified against the product model.

Sidecars inform. Generated informational artifacts, the product handoff, the product context and the coverage mapping, are placed alongside a native OpenSpec change, and only the adapter writes them. The adapter never creates, modifies or removes a native OpenSpec file, and regenerating sidecars leaves every native artifact byte-identical.

The adapter can enumerate the consumer documents of an OpenSpec workspace, so that each document can carry a scope declaration and verification can be enforced over a known population rather than a guess.

Product artifact IDs are preserved verbatim across both mechanisms.

## Rationale

A citation is a claim the consumer makes about its own text, so it must live in the consumer's document under the consumer's authorship; a tool that wrote citations into native documents would be exactly the colonization the boundary rules forbid. A sidecar is information the product side supplies, so it must never pretend to be the consumer's own work; only the adapter writes it, and the byte-identical guarantee holds over everything the adapter touches. Splitting the requirement along ownership keeps both guarantees true at once, where "exclusively sidecars" could only keep one.

Enumeration is in the requirement because verification is framework-blind by constraint: the verifier cannot know which documents of a workspace are consumers of product knowledge. That knowledge is framework-specific, so it belongs to the adapter, and it is what citation enforcement stands on.

This change records the decision taken on issue #71 after Layer 1 shipped and was exercised against a real brownfield repository; it is the model catching up with verified evidence, through the one mechanism the model moves by.

## Affected Product Areas

OpenSpec integration (`FR-OPENSPEC-001`), within delivery integration. The governing boundary rules do not move: `BR-SDD-001` keeps handoffs as the channel by which product knowledge reaches an increment, and `CON-SDD-AGNOSTIC` keeps every framework specific behaviour in the adapter. Citation verification (`UC-CITATIONS-VERIFY-001`, `FR-CITATIONS-VERIFY-001`) is unchanged: this change adjusts what OpenSpec integration promises, not how citations are verified.

No actor, journey, term, business rule or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

`FR-OPENSPEC-001` names both mechanisms and their owners: citations authored in consumer documents by the document's authors, sidecars written only by the adapter. The byte-identical guarantee is scoped to what the adapter writes. The requirement asks the adapter to enumerate consumer documents. The word "exclusively" is gone, and a reader who knows only the shipped Layer 1 integration finds no statement this requirement contradicts.

## Out of Scope

The scope declaration mechanism itself (bound, exempt, unclassified and its enforcement) is follow-up tooling, not part of this change; this change only requires that the adapter can enumerate the documents such a mechanism would classify. The sidecar generator, the `citations backfill` command, the repair of sidecar citation discovery (issue #66), the Layer 2 CI recipe, and every OpenSpec document and integration file in this repository follow this change; they are not part of it. No diagnostic code is introduced, retired or renumbered.
