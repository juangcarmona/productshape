---
name: bind-consumers
description: Backfill scope declarations and citations into existing SDD consumer documents once a Product Definition baseline exists, recording drift instead of fixing it; use when citations verify reports unclassified documents.
---

# Bind Consumers

## Purpose

Make every current SDD consumer document (OpenSpec or Spec Kit) bound or exempt against the accepted Product Definition. The deterministic CLI owns enumeration and verification (`prodshape citations verify --provider <name>`), digests (`prodshape inspect`) and payloads (`prodshape cite`); this skill owns the semantics: deciding which artifacts govern each document, placing citations, and classifying divergences. Citations record grounding; they never change what a document says.

## When to use

- Right after an initial recovery baseline is applied or accepted: the workspace has SDD documents that predate the model, so every one is unclassified and provider verification fails by design.
- Any time provider verification reports unclassified documents or bound documents with zero citations.

Not for authoring new SDD changes (the integration rules in the SDD configuration govern those), and not for changing the model (that is a Product Change).

## Required inputs

- A Product Definition that validates with zero errors (`prodshape validate`). An invalid model offers no reliable IDs or digests; stop and have it fixed first.
- The provider, detected from the installed integration (`openspec` or `speckit`).
- The user's decision on every exemption: `pdac-scope: none` is a human declaration. Collect proposed exemptions with reasons, present them, and write only the approved ones.

## Files to read

- `references/openspec.md`: OpenSpec placement rules (where citations go inside a requirement, which documents the population enumerates).
- `references/speckit.md`: Spec Kit placement rules and scope-declaration carriers.

## Deterministic commands

- `prodshape citations verify --provider <name> --format json`: the document population, per-document scope state, per-citation status. The single source of truth for what remains.
- `prodshape inspect <ID>`: the current artifact digest. Never copy digests from memory or older output.
- `prodshape cite --id <ID> --digest <digest>`: the canonical citation payload. Never write a payload by hand.
- `prodshape impact <ID>`: neighbours, to widen the governing set.
- `prodshape drift`: the recorded drift markers.

## Reasoning procedure

1. Confirm the baseline validates, then run provider verification once to enumerate the population and capture the starting state.
2. Per current document, read it in full. List the artifacts that govern it: search the model by the document's own vocabulary, widen with `prodshape impact` on each hit, and note the neighbours you deliberately leave out.
3. Classify every requirement or claim in the document:
   - Aligned with the model: cite it. Place each citation under the text it grounds, one per line, in the document's native comment, at the position the provider reference specifies.
   - Contradicts the model: record it with `<!-- pdac-drift ids="..." summary="..." -->` next to the conflict and add it to the drift report for the user. Never rewrite either side to make the conflict disappear.
   - Beyond the model (the document knows something the model does not): note it as a candidate for an ordinary Product Change. Never edit the model from here.
   - No product-semantic dependency: queue a proposed exemption with a reason for the user.
4. Declare scope: `pdac-scope: cited` on every document that received citations; write approved exemptions exactly as the user confirmed them.
5. Re-run provider verification. Repeat until every current document is bound or exempt and every citation is current.
6. Hand over: citations added per document, drift markers with summaries, exemptions written, Product Change candidates, and the final verification output. Committing and pull requests are the user's call; when this work follows an applied `CHG-INITIAL`, suggest shipping both in the same pull request so the baseline and its bindings are accepted together.

## Allowed modifications

- Current SDD consumer documents: scope declarations, citation lines, drift markers. Nothing about their meaning.
- Nothing under `docs/product/`.

## Forbidden actions

- Editing `docs/product/model` or any Product Change.
- Changing a document's requirements, scenarios or prose while citing it.
- Declaring an exemption the user did not approve, or declaring one to silence a diagnostic.
- Writing citation payloads or digests by hand.
- Deleting or weakening a citation to hide drift; drift is recorded, presented and decided by humans.
- Citing archived documents; history stays untouched.

## Human approval points

- Every exemption, with its reason.
- Every drift marker: present both sides and a recommendation; the resolution (a Product Change or a spec fix) is the user's.
- The final handover, before anything is committed.

## Expected outputs

- Every current consumer document bound with current citations, or exempt with a human-approved reason.
- A drift list the user can act on (`prodshape drift` reproduces it).
- A list of Product Change candidates for knowledge the model lacks.

## Completion checks

- Provider verification reports zero unclassified documents, zero bound documents without citations, zero unresolved or tampered citations; stale citations follow the repository's warning policy.
- The model directory is byte-identical to when the skill started.
- The handover happened; nothing was committed, merged or accepted by you.
