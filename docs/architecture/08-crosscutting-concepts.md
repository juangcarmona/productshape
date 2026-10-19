---
title: Crosscutting Concepts
arc42-section: '08'
description: Shared architectural mechanisms applied across multiple building blocks.
---

# Crosscutting Concepts

## Canonical files and derived state

### Scope

Applies to the product model, compiled graph, generated indexes, citations, snapshots, and managed provider assets.

### Mechanism

Markdown and YAML files under version control are authoritative. The core parses those files and computes graph state and reports. Derived outputs can be removed and rebuilt. Provider-specific assistant files carry managed markers and are regenerated from canonical assets instead of being edited as independent sources.

### Evidence

ADRs [0001](decisions/0001-markdown-is-canonical.md), [0002](decisions/0002-the-graph-is-derived.md), and [0008](decisions/0008-vendor-assets-are-generated.md); implementation in `src/packages/core/`, `src/packages/distribution/`, and `src/scripts/`.

## Deterministic and semantic work

### Scope

Applies across validation, graph operations, product-change mechanics, citation checks, and assistant workflows.

### Mechanism

Core code enforces structural rules and repeatable outputs. AI assistant skills help elicit or reason about meaning, but end by invoking deterministic validation. Humans make semantic approval and merge decisions.

### Evidence

[ADR 0007](decisions/0007-deterministic-core-and-ai-reasoning-are-separated.md), `src/packages/core/`, and canonical assets in `skills/`.

## Stable identity and citations

### Scope

Applies when product artifacts are referenced from other model artifacts or consumer documents.

### Mechanism

Stable artifact IDs decouple identity from repository paths. A citation binds a consumer statement to an artifact digest. Verification classifies drift; it never silently updates the dependent document.

### Evidence

[ADRs 0003 and 0006](09-architecture-decisions.md), `src/packages/core/src/citations.ts`, and `src/packages/core/src/artifact.ts`.
