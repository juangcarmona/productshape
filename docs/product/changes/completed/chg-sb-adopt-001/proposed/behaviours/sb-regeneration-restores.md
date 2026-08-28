---
id: SB-REGENERATION-RESTORES
type: structured-behaviour
title: Rebuilding derived outputs restores them identically
status: active
illustrates:
  - BR-CANONICAL-001
given:
  - Every generated output has been deleted from a working copy
when: The derived outputs are rebuilt from the authored artifacts
then:
  - Every deleted derived file is restored
  - The restored content is identical to what was deleted
---

## Intent

Establish that no product knowledge lives only in derived form: the compiled graph, reverse indexes, diagrams, snapshots and reports are projections a single rebuild reproduces, so deleting them loses nothing.

## Boundaries

This example does not assert that generated files are committed or ignored, which is a repository policy. It does not cover a managed file edited by hand, which is detected and reported rather than silently regenerated over.
