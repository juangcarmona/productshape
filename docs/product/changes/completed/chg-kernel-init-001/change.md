---
id: CHG-KERNEL-INIT-001
type: product-change
title: Initialize the kernel by default, with the full profile and templates as explicit expansions
status: applied
base-revision: 'cbd0602'
operations:
  add: []
  modify:
    - UC-INIT-001
  remove: []
---

## Problem

Initialization gives a repository the full reference profile before it delivers any value: a directory per artifact kind, the four change directories and the whole template library land on day one, and an empty model then validates with an all-clear message. The first adoption unit is one accepted artifact, one consumer that cites it and one stale dependency detected before merge; the full profile must stay available without being the price of reaching that unit.

`UC-INIT-001` currently states the full profile as the default: the product tree is created "with a directory per artifact kind", and "artifact templates are rendered into the repository". Both sentences make the kernel default a contradiction of canonical text rather than an implementation choice.

## Intended Product Outcome

Initialization installs the kernel by default: the repository configuration, the model home, the live-change home and guidance. Templates and schemas are discoverable on demand without a repository copy. The full reference profile — the per-kind layout, the change archives and the template library — and the AI and SDD integrations are explicit expansions, with an AI selection implying the full profile because its skills author from the templates and the per-kind layout. Validating an empty model states that no product definition exists yet and names the route to the first accepted baseline, instead of presenting emptiness as completed adoption.

## Rationale

The shortest ProductShape experience proves citation drift in seconds, and the adoption path must not expose the entire system before delivering that first proof. A kernel of a handful of files keeps the first ten minutes on the governed loop (CHG-INITIAL, approval, apply, cite, verify) instead of on a file tree, while on-demand discovery keeps authoring cheap without copying contracts into every repository. The expansions stay one command away, so nothing is removed from the reference profile; it just stops being mandatory on day one.

## Affected Product Areas

Repository initialization (`UC-INIT-001`). The SDD-aware behaviour (`FR-INIT-002`), the managed-file authority rules (`FR-DISTRIBUTION-001`) and the change governance around `CHG-INITIAL` are untouched: detection, integration wiring, lock semantics and the governed route to the first baseline all stay exactly as stated.

No actor, journey, term, rule or constraint changes. Nothing is added and nothing is removed.

## Open Questions

None.

## Product Acceptance

`UC-INIT-001` states the kernel as the default outcome of initialization, names templates and schemas as discoverable on demand, and states the per-kind layout, the template library and the integrations as explicit expansions. A reader finds no sentence requiring templates or the per-kind layout to exist after a default initialization.

## Out of Scope

The implementation, the CLI flags, the walkthrough documents and the migration guidance. The sandbox demo remains a documentation concern; the full reference profile itself does not change.
