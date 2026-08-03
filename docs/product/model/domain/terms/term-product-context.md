---
id: TERM-PRODUCT-CONTEXT
type: domain-term
title: Product Context
status: active
defined-in: BC-DELIVERY-INTEGRATION
synonyms: []
---

## Definition

The generated human-readable document, `product-context.md`, that accompanies a Product Handoff. It renders the handoff's product subgraph as prose a developer or an AI coding assistant can read in place — the relevant requirements, rules, terms and their relationships — without traversing the product model itself. It is non-canonical and reproducible at any time.

## Distinguish From

- **The Product Handoff.** The handoff is the machine contract the context accompanies: artifact references, digests, source revision, work-item reference. The context is the readable companion; staleness, coverage and verification are always judged against the handoff, never against the context's prose.
- **Canonical product artifacts.** Artifacts are authored and are the source of truth. The context is generated from them; editing it changes nothing and is lost on regeneration. Any correction it seems to need belongs in the authored artifacts.

## Usage

A Product Context is generated together with its handoff and placed where the consuming SDD framework and its coding assistants will find it — for example alongside an OpenSpec change as a sidecar. It is the document a developer opens to understand the product intent behind an increment, and it is regenerated whenever the handoff is.
