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
  - scenario: Regenerating for the same provider, version and configuration reproduces identical files
  - scenario: A hand-edited managed file is detected and reported
  - scenario: A managed file the current configuration no longer generates is removed
  - scenario: A managed file that would be removed but was hand-edited is kept and reported
---

## Requirement

The product MUST generate every provider-specific AI integration — skills, commands and hooks —
from a single set of canonical assets. Each generated file MUST carry a managed-file header
identifying it as generated and recording version metadata. Generation MUST be reproducible: the
same canonical assets, the same target and the same repository configuration produce identical
files. The product MUST provide an update command that regenerates the installed integrations, and
it MUST detect and report a managed file that has been modified by hand instead of silently
overwriting or silently keeping the edit.

Where a rendering choice is offered, it MUST be recorded in the repository configuration rather than
supplied per invocation, so that regenerating the integrations cannot silently reverse a decision the
repository has already made.

The product MUST remove a managed file that it previously generated and that the current canonical
assets and configuration no longer produce. Removal MUST be conditional on the file still matching
the content recorded for it: a file that has diverged MUST be left in place and reported, never
deleted. Removal MUST be reported alongside what was written.

## Rationale

The methodology is delivered to AI assistants through provider-specific files, and each provider
wants them in its own shape. If those files were maintained per provider by hand, they would
drift — one assistant would follow yesterday's methodology while another follows today's. A single
canonical source with generated projections keeps every provider teaching the same rules, and the
managed-file header tells both humans and tools which files are projections. Detecting manual
edits closes the canonical loop: an improvement made in a generated file would otherwise be lost
at the next update, so the product surfaces it and directs the fix to the canonical asset.

Reproducibility is stated over configuration as well as assets because a rendering choice is a real
input to the output. Omitting it would make the guarantee false the moment any such choice exists,
and a guarantee that is false is worse than a narrower one that holds. Recording the choice in
configuration rather than accepting it per invocation is what keeps the guarantee usable: otherwise
regeneration would depend on how the command was typed, and drift detection would be comparing
against whichever rendering happened last.

Ownership of a generated file is a claim about its absence as well as its presence. A file the
product stops generating is dropped from the record of what it owns, and from that moment no
integrity check covers it: it is neither regenerated, nor reported as drifted, nor removed. It
persists, indistinguishable from something the user wrote, teaching an assistant instructions the
repository no longer intends. Leaving it is the more damaging choice. The digest condition is what
makes removal safe to state as an obligation — the product removes only what it can prove is its own
and untouched, and anything a human has touched stops being the product's to delete.

## Acceptance Scenarios

- A repository is initialized with an AI provider selected. The installed skills, commands and
  hooks each begin with a managed-file header naming the generating product and the asset version.
- The installed integration files are deleted and the update command is run with unchanged
  canonical assets and configuration. The regenerated files are byte-identical to the originals.
- A user edits one managed file by hand. The doctor and update commands report the modification
  with its documented diagnostic code and do not silently discard or silently preserve the edit.
- A repository turns off a rendering choice it previously had on, then regenerates. The files that
  choice produced are removed, their removal is reported, and drift detection is clean afterwards.
- One of those files had been edited by hand. It is left in place and reported rather than removed,
  and the rest of the removal proceeds.
