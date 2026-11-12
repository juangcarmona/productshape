---
title: Quality Requirements
arc42-section: '10'
description: Architectural realization and evidence for product quality requirements.
---

# Quality Requirements

## Quality Requirements Overview

| ProductShape requirement | Architectural realization | Evidence or gap |
| --- | --- | --- |
| [QR-DETERMINISM](../product/model/requirements/quality/qr-determinism.md): identical content gives identical structural results | Core logic is deterministic; generated artifacts are derived from the model | `src/packages/core/`; CI and conformance workflows compare behavior. The product requirement owns the pass criteria. |
| [QR-PORTABILITY](../product/model/requirements/quality/qr-portability.md): consistent supported development platforms | Node.js package with platform-neutral path handling and no shell-dependent core logic | `.github/workflows/ci.yml` runs a Linux, Windows, and macOS matrix on Node 22 and 24. |
| [QR-ACCESSIBILITY](../product/model/requirements/quality/qr-accessibility.md): generated explorer is keyboard operable and understandable without color | Semantic HTML, visible focus, keyboard controls, and embedded assets are implemented in the Product Explorer renderer | `src/packages/cli/src/Product Explorer/`; product verification criteria require rendered inspection. |
| [QR-PRESENTATION](../product/model/requirements/quality/qr-presentation.md): compact, text-first Product Explorer | System fonts, restrained palette, explicit artifact-kind labels, responsive layout | Product Explorer source and `src/scripts/screenshot-explorer.mts`; inspect rendered results against the requirement. |

<!-- pdac:cite id="QR-DETERMINISM" digest="sha256:222606693286667f7974e3dd8b88e6248ca29ce75cb54c9285cc7aaef2c08da3" -->

<!-- pdac:cite id="QR-PORTABILITY" digest="sha256:7dd2a8b7c3eb916792a45dc166bff66be2d6371955a1d4b4863de170465d847f" -->

<!-- pdac:cite id="QR-ACCESSIBILITY" digest="sha256:7694a090493fb8963717e168d1bba8d692e392d7b988a2850ab7357f53cb4f48" -->

<!-- pdac:cite id="QR-PRESENTATION" digest="sha256:d16a3c4eb8a38f0282d47a962ec3822bcd882f1910131d504ed0d2ed75352e88" -->

## Quality Scenarios

The model's quality requirements define their own measurable scenarios. This view records the architectural mechanisms and directs verification to the canonical requirements rather than restating their acceptance criteria.
