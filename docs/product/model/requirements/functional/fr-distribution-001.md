---
id: FR-DISTRIBUTION-001
type: functional-requirement
title: Generate AI provider integrations from canonical assets
status: active
derived-from:
  - UC-INIT-001
  - BR-AI-001
verification:
  - scenario: Installed provider files carry managed-file headers with version metadata
  - scenario: Regenerating for the same provider and version reproduces identical files
  - scenario: A hand-edited managed file is detected and reported
---

## Requirement

The product MUST generate every provider-specific AI integration — skills, commands and hooks —
from a single set of canonical assets. Each generated file MUST carry a managed-file header
identifying it as generated and recording version metadata. Generation MUST be reproducible: the
same canonical assets and the same target produce identical files. The product MUST provide an
update command that regenerates the installed integrations, and it MUST detect and report a
managed file that has been modified by hand instead of silently overwriting or silently keeping
the edit.

## Rationale

The methodology is delivered to AI assistants through provider-specific files, and each provider
wants them in its own shape. If those files were maintained per provider by hand, they would
drift — one assistant would follow yesterday's methodology while another follows today's. A single
canonical source with generated projections keeps every provider teaching the same rules, and the
managed-file header tells both humans and tools which files are projections. Detecting manual
edits closes the canonical loop: an improvement made in a generated file would otherwise be lost
at the next update, so the product surfaces it and directs the fix to the canonical asset.

## Acceptance Scenarios

- A repository is initialized with an AI provider selected. The installed skills, commands and
  hooks each begin with a managed-file header naming the generating product and the asset version.
- The installed integration files are deleted and the update command is run with unchanged
  canonical assets. The regenerated files are byte-identical to the originals.
- A user edits one managed file by hand. The doctor and update commands report the modification
  with its documented diagnostic code and do not silently discard or silently preserve the edit.
