# 0006 — The citation contract is the integration contract

Status: Accepted Date: 2026-07-25

## Context

ADR 0005 keeps the Product Definition and SDD frameworks separate, so something must carry product knowledge across the seam. Pointing an SDD framework at the whole product repository drowns it in irrelevant context and gives no way to detect that the relevant knowledge changed mid-flight. Copying prose by hand is unverifiable: the copy and the definition drift apart, and nothing says so.

Generating a bounded snapshot for each increment fixes the volume problem but not the ownership one. A snapshot is still a copy, it still needs regenerating whenever anything it quotes moves, and readers mistake it for a source of truth however plainly it is marked as generated.

## Decision

The integration contract is the **citation**: a machine-verifiable reference from a consumer document to canonical product text, recording the target artifact `id`, a content `digest`, and an optional `anchor` naming a verification scenario within the target. Consumers cite the Product Definition directly. Nothing is handed to them, and nothing is copied for them.

`prodshape cite` emits a citation record in one of three forms (inline, marker block, or a YAML sidecar ledger), and `prodshape citations verify` recomputes digests and reports exactly one status per citation: `current`, `stale`, `tampered` or `unresolved`. Digests are SHA-256 over UTF-8 bytes with line endings normalized to LF, so a citation resolves identically on every platform.

Staleness is judged per cited artifact. A citation goes stale because the text it cited effectively changed, and never because of unrelated repository activity. Applying a Product Change computes the product diff between the baseline and the applied result, and the affected citation set is derived from that diff rather than from the change's declared operations: an artifact a change said it would modify but left byte-identical sends nothing stale.

A citation carries product context and traceability only. Technical design, tasks, class names, database and framework decisions belong to the SDD and implementation layers.

Because a citation is just an identifier and a digest, the contract is framework- and provider-independent. Any SDD framework, prompt file or design document can carry one.

## Consequences

Positive:

- SDD work reads the definition itself, so there is one copy of product knowledge and it is the canonical one.
- Per-citation digests make "the product definition changed under this work" a mechanical check, not a discovery during review.
- One contract serves every SDD framework, and adding an adapter changes nothing about how consumers bind to the product.
- Nothing needs regenerating when the definition moves; verification simply reports which citations the move affected.

Negative:

- A citation is a pointer, so a consumer reading it out of context gets less surrounding product knowledge than a curated bundle would have provided. Following the pointer is the reader's job.
- Citations go stale by design. Any effective change to a cited artifact reports staleness that a human must resolve, which is recurring friction a "just read the repo" approach would not have, though that approach would have silent drift instead.
- Citation resolution is within one repository in v0.1, so a consumer in a different repository cannot yet bind this way.
