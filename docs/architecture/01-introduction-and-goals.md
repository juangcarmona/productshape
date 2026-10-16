---
title: Introduction and Goals
arc42-section: '01'
description: Architectural orientation, drivers, quality goals, and documentation stakeholders.
---

# Introduction and Goals

## Requirements Overview

ProductShape is the reference implementation of Product Definition as Code: a TypeScript command-line toolkit for defining product knowledge in versioned Markdown, validating its structure, and connecting accepted artifacts to delivery documents. The project does not own the normative methodology; that specification is maintained separately.

The architecture supports a repository-first workflow. The model is authored as files, deterministic code checks structure and relationships, AI integrations assist with semantic drafting, and human review accepts changes. See the [ProductShape model](../product/model/README.md) for product intent and the [PDaC specification](https://github.com/product-definition-as-code/spec) for normative contracts.

## Quality Goals

| Priority | Goal | Architectural response |
| --- | --- | --- |
| 1 | Same authored content produces the same structural results | Pure deterministic core, normalized serialization, ordered diagnostics |
| 2 | Usable across Windows, macOS, and Linux | Node.js CLI, portable path handling, no shell-dependent core behavior |
| 3 | Product truth stays reviewable and owned by its repository | Markdown and YAML are canonical; graph, reports, and snapshots are derived |
| 4 | Provider integrations do not change product semantics | Separate renderers consume canonical assets through explicit adapters |
| 5 | People can inspect the model without installing the CLI | A generated, self-contained, read-only Product Snapshot |

<!-- pdac:cite id="QR-DETERMINISM-001" digest="sha256:222606693286667f7974e3dd8b88e6248ca29ce75cb54c9285cc7aaef2c08da3" -->

<!-- pdac:cite id="QR-PORTABILITY-001" digest="sha256:7dd2a8b7c3eb916792a45dc166bff66be2d6371955a1d4b4863de170465d847f" -->

## Stakeholders

| Architecture reader | Expectation |
| --- | --- |
| Maintainer | Understand package boundaries, release paths, and implementation trade-offs |
| Contributor | Locate the implementation area for a behavior without treating generated files as canonical |
| Adopter | Understand the CLI and its integrations at a technical level |
| Architecture reviewer | Check that implementation structure stays aligned with product intent and recorded ADRs |
