---
title: Quality Requirements
arc42-section: '10'
description: Architectural realization and evidence for product quality requirements.
---

# Quality Requirements

## Quality Requirements Overview

| ProductShape requirement | Architectural realization | Evidence or gap |
| --- | --- | --- |
| [QR-DETERMINISM-001](../product/model/requirements/quality/qr-determinism-001.md): identical content gives identical structural results | Core logic is deterministic; generated artifacts are derived from the model | `packages/core/`; CI and conformance workflows compare behavior. The product requirement owns the pass criteria. |
| [QR-PORTABILITY-001](../product/model/requirements/quality/qr-portability-001.md): consistent supported development platforms | Node.js package with platform-neutral path handling and no shell-dependent core logic | `.github/workflows/ci.yml` runs a Linux, Windows, and macOS matrix on Node 22 and 24. |
| [QR-ACCESSIBILITY-001](../product/model/requirements/quality/qr-accessibility-001.md): generated explorer is keyboard operable and understandable without color | Semantic HTML, visible focus, keyboard controls, and embedded assets are implemented in the snapshot renderer | `packages/cli/src/snapshot/`; product verification criteria require rendered inspection. |
| [QR-PRESENTATION-001](../product/model/requirements/quality/qr-presentation-001.md): compact, text-first snapshot | System fonts, restrained palette, explicit artifact-kind labels, responsive layout | Snapshot source and `scripts/screenshot-snapshot.mts`; inspect rendered results against the requirement. |

<!-- pdac:cite id="QR-DETERMINISM-001" digest="sha256:222606693286667f7974e3dd8b88e6248ca29ce75cb54c9285cc7aaef2c08da3" -->

<!-- pdac:cite id="QR-PORTABILITY-001" digest="sha256:7dd2a8b7c3eb916792a45dc166bff66be2d6371955a1d4b4863de170465d847f" -->

<!-- pdac:cite id="QR-ACCESSIBILITY-001" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->

<!-- pdac:cite id="QR-PRESENTATION-001" digest="sha256:d16a3c4eb8a38f0282d47a962ec3822bcd882f1910131d504ed0d2ed75352e88" -->

## Quality Scenarios

The model's quality requirements define their own measurable scenarios. This view records the architectural mechanisms and directs verification to the canonical requirements rather than restating their acceptance criteria.
