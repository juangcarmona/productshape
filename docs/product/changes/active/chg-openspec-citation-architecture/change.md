---
id: CHG-OPENSPEC-CITATION-ARCHITECTURE
type: product-change
title: OpenSpec integration is citation-based configuration, not sidecar artifacts
status: draft
base-revision: 'e9e0e9ca7e8b2794f239567f5183daa3383ce5e9'
operations:
  add: []
  modify:
    - FR-OPENSPEC-001
    - FR-EXPLORE-001
  remove: []
---

## Problem

`FR-OPENSPEC-001` still describes the removed Product Handoff, Product Context and coverage sidecar architecture (verification scenarios S2, S3, S4). The shipped integration does not produce sidecars: it merges PDaC citation guidance into the OpenSpec configuration surface (`openspec/config.yaml`) and verifies citations against the consumer document population. The requirement contradicts the implementation and the citation-based integration architecture established by ADR 0006.

`FR-EXPLORE-001` references `ps:explore` as the skill name, but the canonical skill is `explore-product` and the invocation is `/product:explore` (with `/ps:explore` as an opt-in shorthand alias). The requirement also says "fewer than approximately three artifact files" for greenfield mode, but the skill implementation uses "fewer than approximately five graph nodes" — a more accurate measure of model completeness.

## Intended Product Outcome

`FR-OPENSPEC-001` describes a citation-based configuration integration. The product integrates with OpenSpec through two mechanisms with distinct ownership:

1. Citations bind. An OpenSpec document that depends on canonical product text carries a citation to every product artifact it derives from. Citations live in the consumer document and are authored by whoever authors that document; the product side never writes citations into native OpenSpec files. Citations are verified against the product model through citation verification.

2. Configuration informs. The integration merges PDaC authority context and citation rules into the official OpenSpec configuration surface (`openspec/config.yaml`), preserving existing schema, context, rules, guidance, comments and unrelated user configuration. The integration never patches OpenSpec-generated commands or skills, never forks OpenSpec's default schema, and never creates Product Handoff, Product Context or coverage sidecars.

The integration can enumerate the consumer documents of an OpenSpec workspace — distinguishing current changes from archived history — so that each document can carry a scope declaration and verification can be enforced over a known population. Default verification excludes archived historical changes; historical verification is an explicit mode.

Every product artifact ID is preserved verbatim across both mechanisms.

`FR-EXPLORE-001` references the canonical skill name `explore-product` and the canonical invocation `/product:explore`, noting that `/ps:explore` is an opt-in shorthand alias. The greenfield threshold is "fewer than approximately five graph nodes", matching the skill implementation.

## Rationale

The sidecar architecture was retired because a citation is a pointer, not a copy: consumers cite the canonical definition directly, and nothing needs regenerating when the definition moves. ADR 0006 established the citation as the integration contract. The configuration integration is the natural shape: OpenSpec provides `openspec/config.yaml` as its official customization surface, and PDaC guidance is additive context and rules, not a structural change to the OpenSpec workflow.

Enumeration and scope declarations are required because a verifier that cannot name its population can only guess at coverage. Zero discovered citations must not mean success: every in-scope current consumer document must explicitly declare `pdac-scope: none` or carry citations.

The greenfield threshold of five graph nodes (not three artifact files) is more accurate because a model with three artifacts (e.g. one actor, one use case, one rule) has enough structure to reason about, while three files could be three orphaned terms.

## Affected Product Areas

OpenSpec integration (`FR-OPENSPEC-001`), explore skill (`FR-EXPLORE-001`), within delivery integration and AI skills. The governing boundary rules do not change: `BR-SDD-001` keeps citations as the channel by which product knowledge reaches an increment, and `CON-SDD-AGNOSTIC` keeps every framework-specific behaviour in the integration.

## Open Questions

None.

## Product Acceptance

- `FR-OPENSPEC-001` no longer mentions Product Handoff, Product Context, coverage sidecars or byte-identical guarantees over sidecars.
- `FR-OPENSPEC-001` describes the configuration integration and the citation-based verification with scope declarations.
- `FR-EXPLORE-001` references `explore-product` and `/product:explore`, not `ps:explore` as the canonical name.
- `FR-EXPLORE-001` uses "fewer than approximately five graph nodes" for the greenfield threshold.

## Out of Scope

Implementation, CLI commands, provider renderers, tests. This change adjusts what the Product Definition says about the OpenSpec integration and the explore skill, not how it is built.
