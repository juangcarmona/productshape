---
title: Runtime View
arc42-section: '06'
description: Architecturally significant runtime scenarios and building-block interactions.
---

# Runtime View

## Repository adoption

1. A maintainer runs `prodshape init`; the CLI and distribution package create the kernel files in the selected repository.
2. The maintainer or assistant authors proposed artifacts in a Product Change.
3. The CLI parses the proposal, compiles an overlay, and reports structural diagnostics. It does not decide whether the proposed product meaning is correct.
4. A human reviews and approves the proposal; explicit apply updates the working tree.
5. A pull request records the file changes; merge accepts the new baseline.

### Failure Behavior

Invalid schemas, unresolved relationships, stale bases, or unsafe paths produce diagnostics and prevent the corresponding operation. Apply revalidates before writing so an earlier validation result cannot authorize a changed proposal.

## Citation drift detection

1. `prodshape cite` reads an accepted artifact and emits a citation containing its stable identity and content digest.
2. A consumer document stores that citation next to the text it grounds.
3. `prodshape citations verify` resolves each citation against the current model and reports current, stale, tampered, or unresolved status.
4. If the referenced artifact changes, verification identifies the drift for human review; it does not rewrite the consumer document.

### Failure Behavior

Provider-aware verification checks the expected consumer population for supported workspaces. Missing or invalid coverage is surfaced as a failure or diagnostic rather than treated as a successful empty scan.

<!-- pdac:cite id="UC-CHANGE-001" digest="sha256:43d756bd7c45a2357142fe8c8f310401684822a39c5a95f6dcbe48469dd5c64a" -->

<!-- pdac:cite id="UC-CITATIONS-VERIFY-001" digest="sha256:315ec462a95c687154018b5247b89765e29f2d1f07f015658483ac8b47757cfa" -->
